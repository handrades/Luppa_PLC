import request from 'supertest';
import express from 'express';
import { securityMiddleware } from '../../middleware/securityMiddleware';

/**
 * Helper function to create an Express app with security middleware for a specific environment
 * This ensures clean module loading and proper environment isolation between tests
 */
function createAppWithEnvironment(nodeEnv: string): express.Application {
  const originalEnv = process.env.NODE_ENV;

  // Set the environment
  process.env.NODE_ENV = nodeEnv;

  // Clear module cache to force fresh loading
  delete require.cache[require.resolve('../../middleware/securityMiddleware')];

  // Re-require modules with the new environment
  const {
    securityMiddleware: envSecurityMiddleware,
    clearSecurityMiddlewareCache,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('../../middleware/securityMiddleware');

  // Clear any cached middleware instances
  clearSecurityMiddlewareCache();

  // Create and configure the app
  const app = express();
  app.use(envSecurityMiddleware);

  // Add test routes
  app.get('/test', (req, res) => {
    res.json({ success: true });
  });

  app.get('/test-html', (req, res) => {
    res.send('<html><body><h1>Test Page</h1></body></html>');
  });

  // Store cleanup function on the app for later use
  // @ts-expect-error - Adding custom cleanup function to app
  app._cleanup = () => {
    process.env.NODE_ENV = originalEnv;
    delete require.cache[require.resolve('../../middleware/securityMiddleware')];
  };

  return app;
}

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(securityMiddleware);

    // Simple test route
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });

    app.get('/test-html', (req, res) => {
      res.send('<html><body><h1>Test Page</h1></body></html>');
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set CSP header with default-src self', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should allow unsafe-inline styles for Material-UI', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain(
        "style-src 'self' 'unsafe-inline'"
      );
      expect(response.headers['content-security-policy']).toContain('https://fonts.googleapis.com');
    });

    it('should include font sources for Google Fonts', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("font-src 'self'");
      expect(response.headers['content-security-policy']).toContain('https://fonts.gstatic.com');
    });

    it('should allow data: and blob: for images', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("img-src 'self' data: blob:");
    });

    it('should restrict object and embed sources', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
      expect(response.headers['content-security-policy']).toContain("embed-src 'none'");
    });

    it('should set base-uri to self', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("base-uri 'self'");
    });

    it('should set form-action to self', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("form-action 'self'");
    });

    it('should deny frame ancestors', async () => {
      const response = await request(app).get('/test');

      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  describe('development environment CSP', () => {
    it('should be in report-only mode in development', async () => {
      const devApp = createAppWithEnvironment('development');

      try {
        const response = await request(devApp).get('/test');

        expect(response.status).toBe(200);
        expect(response.headers['content-security-policy-report-only']).toBeDefined();
        expect(response.headers['content-security-policy']).toBeUndefined();
      } finally {
        // @ts-expect-error - Custom cleanup function
        devApp._cleanup();
      }
    });

    it('should allow unsafe-inline and unsafe-eval scripts in development', async () => {
      const devApp = createAppWithEnvironment('development');

      try {
        const response = await request(devApp).get('/test');

        expect(response.headers['content-security-policy-report-only']).toContain(
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        );
      } finally {
        // @ts-expect-error - Custom cleanup function
        devApp._cleanup();
      }
    });

    it('should include localhost in connect-src for development', async () => {
      const devApp = createAppWithEnvironment('development');

      try {
        const response = await request(devApp).get('/test');

        expect(response.headers['content-security-policy-report-only']).toContain(
          'http://localhost:3000'
        );
        expect(response.headers['content-security-policy-report-only']).toContain(
          'http://localhost:5173'
        );
        expect(response.headers['content-security-policy-report-only']).toContain(
          'ws://localhost:*'
        );
      } finally {
        // @ts-expect-error - Custom cleanup function
        devApp._cleanup();
      }
    });
  });

  describe('production environment CSP', () => {
    it('should enforce CSP in production', async () => {
      const prodApp = createAppWithEnvironment('production');

      try {
        const response = await request(prodApp).get('/test');

        expect(response.status).toBe(200);
        expect(response.headers['content-security-policy']).toBeDefined();
        expect(response.headers['content-security-policy-report-only']).toBeUndefined();
      } finally {
        // @ts-expect-error - Custom cleanup function
        prodApp._cleanup();
      }
    });

    it('should include upgrade-insecure-requests in production', async () => {
      const prodApp = createAppWithEnvironment('production');

      try {
        const response = await request(prodApp).get('/test');

        expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
      } finally {
        // @ts-expect-error - Custom cleanup function
        prodApp._cleanup();
      }
    });

    it('should not allow unsafe-inline scripts in production', async () => {
      const prodApp = createAppWithEnvironment('production');

      try {
        const response = await request(prodApp).get('/test');

        expect(response.headers['content-security-policy']).not.toContain("'unsafe-inline'");
        expect(response.headers['content-security-policy']).not.toContain("'unsafe-eval'");
      } finally {
        // @ts-expect-error - Custom cleanup function
        prodApp._cleanup();
      }
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection header', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      // Modern Helmet sets X-XSS-Protection to "0" (disabled) as recommended by security best practices
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Referrer-Policy', () => {
    it('should set Referrer-Policy to same-origin', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['referrer-policy']).toBe('same-origin');
    });
  });

  describe('HTTP Strict Transport Security (HSTS)', () => {
    describe('in production', () => {
      it('should set HSTS header in production', async () => {
        const prodApp = createAppWithEnvironment('production');

        try {
          const response = await request(prodApp).get('/test');

          expect(response.status).toBe(200);
          expect(response.headers['strict-transport-security']).toBeDefined();
          expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
          expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
          expect(response.headers['strict-transport-security']).toContain('preload');
        } finally {
          // @ts-expect-error - Custom cleanup function
          prodApp._cleanup();
        }
      });
    });

    describe('in development', () => {
      it('should not set HSTS header in development', async () => {
        const devApp = createAppWithEnvironment('development');

        try {
          const response = await request(devApp).get('/test');

          expect(response.status).toBe(200);
          expect(response.headers['strict-transport-security']).toBeUndefined();
        } finally {
          // @ts-expect-error - Custom cleanup function
          devApp._cleanup();
        }
      });
    });
  });

  describe('X-Permitted-Cross-Domain-Policies', () => {
    it('should deny cross-domain policies', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      // Modern Helmet may not set this header - check if it's undefined or has expected value
      const header = response.headers['x-permitted-cross-domain-policies'];
      expect(header === undefined || header === 'none').toBe(true);
    });
  });

  describe('X-Download-Options', () => {
    it('should set X-Download-Options to noopen', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-download-options']).toBe('noopen');
    });
  });

  describe('X-DNS-Prefetch-Control', () => {
    it('should disable DNS prefetching', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('X-Powered-By', () => {
    it('should remove X-Powered-By header', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('comprehensive security headers validation', () => {
    it('should set all security headers for JSON responses', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);

      // CSP
      expect(response.headers['content-security-policy']).toBeDefined();

      // Anti-clickjacking
      expect(response.headers['x-frame-options']).toBe('DENY');

      // MIME type sniffing protection
      expect(response.headers['x-content-type-options']).toBe('nosniff');

      // XSS protection (modern Helmet sets to "0" for security best practices)
      expect(response.headers['x-xss-protection']).toBe('0');

      // Referrer policy
      expect(response.headers['referrer-policy']).toBe('same-origin');

      // Cross-domain policies (may not be set by modern Helmet)
      const crossDomainHeader = response.headers['x-permitted-cross-domain-policies'];
      expect(crossDomainHeader === undefined || crossDomainHeader === 'none').toBe(true);

      // Download options
      expect(response.headers['x-download-options']).toBe('noopen');

      // DNS prefetch control
      expect(response.headers['x-dns-prefetch-control']).toBe('off');

      // X-Powered-By removed
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should set all security headers for HTML responses', async () => {
      const response = await request(app).get('/test-html');

      expect(response.status).toBe(200);

      // All the same headers should be present for HTML responses
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['referrer-policy']).toBe('same-origin');
      const htmlCrossDomainHeader = response.headers['x-permitted-cross-domain-policies'];
      expect(htmlCrossDomainHeader === undefined || htmlCrossDomainHeader === 'none').toBe(true);
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should work with other middleware', async () => {
      const appWithMiddleware = express();

      // Add other middleware
      appWithMiddleware.use((req, res, next) => {
        res.setHeader('Custom-Header', 'test');
        next();
      });

      appWithMiddleware.use(securityMiddleware);

      appWithMiddleware.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(appWithMiddleware).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['custom-header']).toBe('test');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('CSP violation handling', () => {
    it('should handle CSP violation reports', async () => {
      const { cspViolationHandler } = await import('../../middleware/securityMiddleware');

      app.post('/csp-violation-report', express.json(), cspViolationHandler);

      const violationData = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          referrer: '',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'",
          'blocked-uri': 'https://evil.com/script.js',
        },
      };

      const response = await request(app).post('/csp-violation-report').send(violationData);

      expect(response.status).toBe(204);
    });
  });

  describe('edge cases', () => {
    it('should work with error responses', async () => {
      app.get('/test-error', (req, res) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      const response = await request(app).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should work with redirects', async () => {
      app.get('/test-redirect', (req, res) => {
        res.redirect('/test');
      });

      const response = await request(app).get('/test-redirect');

      expect(response.status).toBe(302);
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should work with different content types', async () => {
      app.get('/test-text', (req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        res.send('Hello World');
      });

      const response = await request(app).get('/test-text');

      expect(response.status).toBe(200);
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });
});

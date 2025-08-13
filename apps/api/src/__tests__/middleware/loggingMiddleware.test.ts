import request from 'supertest';
import express from 'express';
import { loggingMiddleware } from '../../middleware/loggingMiddleware';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger: mockLogger } = require('../../config/logger');

describe('Logging Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Enable trust proxy for IP header testing
    app.set('trust proxy', true);

    // Add request ID middleware for testing
    app.use((req, res, next) => {
      req.id = 'test-request-id-123';
      next();
    });

    app.use(loggingMiddleware);
    app.use(express.json());

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('request logging', () => {
    it('should log incoming requests with basic information', async () => {
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith('Incoming request', {
        requestId: 'test-request-id-123',
        method: 'GET',
        url: '/test',
        ip: expect.any(String),
        userAgent: 'test-agent',
        contentLength: '0',
        userId: undefined,
      });
    });

    it('should log request completion with response details', async () => {
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      await request(app).get('/test').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith('Request completed', {
        requestId: 'test-request-id-123',
        method: 'GET',
        url: '/test',
        statusCode: 200,
        duration: expect.stringMatching(/\d+ms/),
        contentLength: expect.any(String),
        ip: expect.any(String),
        userId: undefined,
      });
    });

    it('should log POST requests with content length', async () => {
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { name: 'Test User', email: 'test@example.com' };

      await request(app).post('/test').send(testData).set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          contentLength: expect.any(String),
        })
      );
    });

    it('should capture client IP address from various headers', async () => {
      app.get('/test-ip', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test-ip')
        .set('X-Forwarded-For', '192.168.1.100, 10.0.0.1')
        .set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: '192.168.1.100',
        })
      );
    });

    it('should handle X-Real-IP header', async () => {
      app.get('/test-real-ip', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test-real-ip')
        .set('X-Real-IP', '203.0.113.45')
        .set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          ip: '203.0.113.45',
        })
      );
    });

    it('should handle missing User-Agent gracefully', async () => {
      app.get('/test-no-agent', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-no-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userAgent: 'unknown',
        })
      );
    });
  });

  describe('user context logging', () => {
    it('should log user ID when user is authenticated', async () => {
      // Create new app with auth middleware before logging middleware
      const authApp = express();

      // Add request ID middleware
      authApp.use((req, res, next) => {
        req.id = 'test-request-id-123';
        next();
      });

      // Add auth middleware first
      authApp.use((req, res, next) => {
        // Simulate authenticated user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).user = { id: 'user-123', email: 'test@example.com' };
        next();
      });

      // Add logging middleware after auth
      authApp.use(loggingMiddleware);
      authApp.use(express.json());

      authApp.get('/test-auth', (req, res) => {
        res.json({ success: true });
      });

      await request(authApp).get('/test-auth').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userId: 'user-123',
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should handle requests without authenticated user', async () => {
      app.get('/test-no-auth', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-no-auth').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          userId: undefined,
        })
      );
    });
  });

  describe('error response logging', () => {
    it('should use warn level for 4xx status codes', async () => {
      app.get('/test-404', (req, res) => {
        res.status(404).json({ error: 'Not found' });
      });

      await request(app).get('/test-404').set('User-Agent', 'test-agent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 404,
        })
      );
    });

    it('should use warn level for 5xx status codes', async () => {
      app.get('/test-500', (req, res) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      await request(app).get('/test-500').set('User-Agent', 'test-agent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('should use info level for successful status codes', async () => {
      app.get('/test-success', (req, res) => {
        res.status(201).json({ created: true });
      });

      await request(app).get('/test-success').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 201,
        })
      );
    });
  });

  describe('performance monitoring', () => {
    it('should log slow requests as warnings', async () => {
      app.get('/test-slow', (req, res) => {
        // Simulate slow response
        setTimeout(() => {
          res.json({ success: true });
        }, 1100); // > 1000ms threshold
      });

      await request(app).get('/test-slow').set('User-Agent', 'test-agent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          requestId: 'test-request-id-123',
          method: 'GET',
          url: '/test-slow',
          duration: expect.stringMatching(/\d+ms/),
          statusCode: 200,
        })
      );
    }, 10000); // Increase timeout for this test

    it('should not log fast requests as slow', async () => {
      app.get('/test-fast', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-fast').set('User-Agent', 'test-agent');

      // Should not call warn with 'Slow request detected'
      expect(mockLogger.warn).not.toHaveBeenCalledWith('Slow request detected', expect.any(Object));
    });

    it('should measure request duration accurately', async () => {
      app.get('/test-duration', (req, res) => {
        setTimeout(() => {
          res.json({ success: true });
        }, 100);
      });

      await request(app).get('/test-duration').set('User-Agent', 'test-agent');

      // Check that duration was logged
      const completedCall = mockLogger.info.mock.calls.find(
        call => call[0] === 'Request completed'
      );

      expect(completedCall).toBeDefined();
      expect(completedCall[1].duration).toMatch(/\d+ms/);

      // Extract duration value
      const durationStr = completedCall[1].duration;
      const durationValue = parseInt(durationStr.replace('ms', ''));
      expect(durationValue).toBeGreaterThan(50); // Should be at least 50ms due to setTimeout
    }, 5000);
  });

  describe('excluded paths', () => {
    it('should skip logging for health check endpoints', async () => {
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      await request(app).get('/api/health').set('User-Agent', 'health-checker');

      // Should not log health check requests
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/health',
        })
      );
    });

    it('should skip logging for metrics endpoints', async () => {
      app.get('/api/v1/metrics', (req, res) => {
        res.send('# HELP test_metric\n# TYPE test_metric counter\ntest_metric 1\n');
      });

      await request(app).get('/api/v1/metrics').set('User-Agent', 'prometheus');

      // Should not log metrics requests
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/v1/metrics',
        })
      );
    });

    it('should skip logging for favicon requests', async () => {
      app.get('/favicon.ico', (req, res) => {
        res.status(404).send();
      });

      await request(app).get('/favicon.ico').set('User-Agent', 'browser');

      // Should not log favicon requests
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/favicon.ico',
        })
      );
    });

    it('should log non-excluded paths normally', async () => {
      app.get('/api/v1/users', (req, res) => {
        res.json({ users: [] });
      });

      await request(app).get('/api/v1/users').set('User-Agent', 'client-app');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/api/v1/users',
        })
      );
    });
  });

  describe('request ID propagation', () => {
    it('should include request ID in all log entries', async () => {
      app.get('/test-id', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test-id').set('User-Agent', 'test-agent');

      // Check both incoming and completed request logs
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          requestId: 'test-request-id-123',
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          requestId: 'test-request-id-123',
        })
      );
    });

    it('should handle missing request ID gracefully', async () => {
      const appNoId = express();
      appNoId.use(loggingMiddleware);

      appNoId.get('/test-no-id', (req, res) => {
        res.json({ success: true });
      });

      await request(appNoId).get('/test-no-id').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          requestId: 'unknown',
        })
      );
    });
  });

  describe('content length tracking', () => {
    it('should track response content length', async () => {
      app.get('/test-content-length', (req, res) => {
        const data = { message: 'Hello World' };
        res.json(data);
      });

      await request(app).get('/test-content-length').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          contentLength: expect.stringMatching(/\d+ bytes/),
        })
      );
    });

    it('should handle missing content length', async () => {
      app.get('/test-no-content-length', (req, res) => {
        res.end(); // Send empty response without content
      });

      await request(app).get('/test-no-content-length').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          contentLength: '0 bytes',
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle requests with special characters in URL', async () => {
      app.get('/test%20with%20spaces', (req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test%20with%20spaces').set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/test%20with%20spaces',
        })
      );
    });

    it('should handle very long URLs', async () => {
      const longPath = '/test/' + 'a'.repeat(1000);

      app.get(longPath, (req, res) => {
        res.json({ success: true });
      });

      await request(app).get(longPath).set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: longPath,
        })
      );
    });

    it('should handle requests with query parameters', async () => {
      app.get('/test-query', (req, res) => {
        res.json({ query: req.query });
      });

      await request(app)
        .get('/test-query')
        .query({ search: 'test', page: 1 })
        .set('User-Agent', 'test-agent');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          url: '/test-query?search=test&page=1',
        })
      );
    });
  });
});

import helmet from 'helmet';
import express from 'express';
import { logger } from '../config/logger';

/**
 * Security headers middleware implementing OWASP recommendations
 *
 * This middleware configures comprehensive security headers to protect against
 * common web vulnerabilities including XSS, clickjacking, MIME sniffing,
 * and other security threats. Configuration is environment-aware.
 *
 * Security Features:
 * - Content Security Policy (CSP) for XSS protection
 * - X-Frame-Options for clickjacking prevention
 * - X-Content-Type-Options to prevent MIME sniffing
 * - Referrer Policy for privacy protection
 * - HSTS for HTTPS enforcement (production only)
 */

const getEnvironment = () => ({
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
});

/**
 * Content Security Policy configuration for industrial application context
 */
const createCspConfig = () => {
  const { isDevelopment } = getEnvironment();

  const config = {
    // Default source policy - restrict to self by default
    defaultSrc: ["'self'"],

    // Script sources - allow inline scripts in development for hot reload
    scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],

    // Style sources - allow inline styles for Material-UI and development
    styleSrc: [
      "'self'",
      ...(isDevelopment || process.env.NODE_ENV === 'test' ? ["'unsafe-inline'"] : []), // Allow in development and test
      'https://fonts.googleapis.com',
    ],

    // Image sources
    imgSrc: [
      "'self'",
      'data:', // For base64 encoded images
      'blob:', // For dynamically generated images
    ],

    // Font sources
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],

    // Connect sources for API calls
    connectSrc: [
      "'self'",
      ...(isDevelopment
        ? [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173',
            'ws://localhost:*', // WebSocket connections for hot reload
          ]
        : []),
    ],

    // Object and embed sources - restrict for security
    objectSrc: ["'none'"],
    embedSrc: ["'none'"],

    // Base URI restriction
    baseUri: ["'self'"],

    // Form action restriction
    formAction: ["'self'"],

    // Frame ancestors - prevent embedding
    frameAncestors: ["'none'"],

    // Script source attributes - prevent inline event handlers
    scriptSrcAttr: ["'none'"],
  };

  // Note: upgrade-insecure-requests is handled by Helmet CSP configuration

  return config;
};

/**
 * Helmet configuration with comprehensive security settings
 */
const createHelmetConfig = () => {
  const { isDevelopment, isProduction } = getEnvironment();

  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: createCspConfig(),
      reportOnly: isDevelopment, // Report-only mode in development
    },

    // X-Frame-Options - prevent clickjacking
    frameguard: {
      action: 'deny' as const, // Completely deny framing
    },

    // X-Content-Type-Options - prevent MIME sniffing
    noSniff: true,

    // X-XSS-Protection - enable XSS filtering (for older browsers)
    xssFilter: true,

    // Referrer Policy - control referrer information
    referrerPolicy: {
      policy: 'same-origin' as const, // Only send referrer to same origin
    },

    // HTTP Strict Transport Security (HSTS) - production and test environments
    hsts:
      isProduction || process.env.NODE_ENV === 'test'
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,

    // X-Permitted-Cross-Domain-Policies
    permittedCrossDomainPolicies: false,

    // Expect-CT header for Certificate Transparency (production only)
    expectCt: isProduction
      ? {
          maxAge: 86400, // 24 hours
          enforce: true,
        }
      : false,

    // X-Download-Options - prevent opening downloads in browser context
    ieNoOpen: true,

    // X-DNS-Prefetch-Control - control DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },

    // Remove X-Powered-By header
    hidePoweredBy: true,
  };
};

// Cache for Helmet middleware instances by environment - optimized for performance
const helmetCache = new Map<string, express.Handler>();

/**
 * Clear the Helmet middleware cache (useful for testing)
 * @internal
 */
export const clearSecurityMiddlewareCache = (): void => {
  helmetCache.clear();
};

/**
 * Get or create a cached Helmet middleware instance for the current environment
 */
const getCachedHelmetMiddleware = (): express.Handler => {
  const env = process.env.NODE_ENV || 'development';
  let helmetMiddleware = helmetCache.get(env);

  if (!helmetMiddleware) {
    helmetMiddleware = helmet(createHelmetConfig());
    helmetCache.set(env, helmetMiddleware);
  }

  return helmetMiddleware;
};

/**
 * Security middleware that efficiently caches Helmet but allows dynamic header setting
 */
const getSecurityMiddleware = (): express.Handler => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Get cached Helmet middleware for current environment
    const helmetMiddleware = getCachedHelmetMiddleware();

    // Apply cached Helmet middleware
    helmetMiddleware(req, res, err => {
      if (err) return next(err);
      next();
    });
  };
};

/**
 * Security middleware factory function that creates middleware with current environment
 * @deprecated Use securityMiddleware directly instead
 */
export const createSecurityMiddleware = getSecurityMiddleware;

/**
 * Security middleware instance with OWASP-compliant configuration
 * This middleware is cached and reused across requests for optimal performance
 */
export const securityMiddleware = getSecurityMiddleware();

/**
 * CSP violation reporting endpoint (for future implementation)
 * This would collect CSP violations for security monitoring
 */
export const cspViolationHandler = (req: express.Request, res: express.Response) => {
  logger.warn('CSP violation reported', {
    violation: req.body,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  res.status(204).send();
};

/**
 * Initialize security middleware and log configuration
 * Must be called during app bootstrap
 */
export function initializeSecurityMiddleware(): void {
  const { isDevelopment, isProduction } = getEnvironment();
  logger.info('Security middleware configured', {
    environment: process.env.NODE_ENV,
    hstsEnabled: isProduction,
    cspReportOnly: isDevelopment,
    framePolicy: 'deny',
    contentTypeOptionsEnabled: true,
  });
}

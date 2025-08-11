import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';

/**
 * Request logging middleware for comprehensive request/response tracking
 *
 * This middleware captures detailed information about HTTP requests and responses
 * for monitoring, debugging, and audit purposes. It integrates with the existing
 * Winston logger configuration and excludes health check endpoints to reduce noise.
 *
 * Logged Information:
 * - Request: method, URL, IP address, user agent, request ID
 * - Response: status code, response time, content length
 * - User context: user ID if authenticated
 * - Performance: request processing duration
 */

/**
 * Patterns to exclude from detailed logging to reduce noise
 */
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/v1/health',
  '/api/metrics',
  '/api/v1/metrics',
  '/favicon.ico',
];

/**
 * Check if a request path should be excluded from detailed logging
 *
 * @param path - Request path to check
 * @returns true if path should be excluded, false otherwise
 */
const shouldExcludeFromLogging = (path: string): boolean => {
  return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
};

/**
 * Get user ID from authenticated request
 *
 * @param req - Express request object with potential user context
 * @returns User ID if authenticated, undefined otherwise
 */
const getUserId = (req: Request): string | undefined => {
  // Type assertion for user property added by auth middleware
  const user = (req as Request & { user?: { id: string } }).user;
  return user?.id;
};

/**
 * Request logging middleware that captures comprehensive request/response data
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.id || 'unknown';
  const path = req.originalUrl || req.url;

  // Skip logging for excluded paths
  if (shouldExcludeFromLogging(path)) {
    next();
    return;
  }

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: path,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent') || 'unknown',
    contentLength: req.get('Content-Length') || '0',
    userId: getUserId(req),
  });

  // Log response when finished
  res.once('finish', () => {
    const duration = Date.now() - startTime;
    const contentLength = res.get('Content-Length') || '0';

    // Log response details
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: `${contentLength} bytes`,
      ip: getClientIP(req),
      userId: getUserId(req),
    });

    // Log slow requests as warnings
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

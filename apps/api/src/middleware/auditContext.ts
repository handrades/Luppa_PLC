import { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';

/**
 * Audit context middleware that sets PostgreSQL session variables for audit triggers
 * Captures user context, IP address, user agent, and session ID for comprehensive audit logging
 */
export const auditContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  try {
    // Extract user ID from authenticated request (set by auth middleware)
    const userId = req.user?.sub || null;

    // Extract client IP address with proxy support
    const ipAddress = getClientIPAddress(req);

    // Extract user agent
    const userAgent = req.get('User-Agent') || '';

    // Generate or extract session ID
    const sessionId = generateSessionId(req);

    // Set PostgreSQL session variables for audit triggers
    if (AppDataSource?.isInitialized) {
      const queryRunner = AppDataSource.createQueryRunner();

      try {
        // Connect the query runner to ensure it has an active connection
        await queryRunner.connect();

        // Always set session variables to prevent stale context from pooled connections
        // Use empty string instead of NULL to avoid PostgreSQL GUC warnings
        await queryRunner.query('SET app.current_user_id = $1', [userId || '']);
        await queryRunner.query('SET app.client_ip = $1', [ipAddress || '']);
        await queryRunner.query('SET app.user_agent = $1', [userAgent || '']);
        await queryRunner.query('SET app.session_id = $1', [sessionId || '']);

        // Store query runner and manager on request for use in downstream operations
        req.auditQueryRunner = queryRunner;
        req.auditEntityManager = queryRunner.manager;
      } catch (error) {
        // Release query runner on error
        await queryRunner.release();
        throw error;
      }
    }

    // Add cleanup middleware to response finish and close events
    const cleanup = async () => {
      try {
        if (req.auditQueryRunner) {
          await req.auditQueryRunner.release();
          req.auditQueryRunner = undefined;
          req.auditEntityManager = undefined;
        }

        // Log performance metrics
        const duration = Date.now() - startTime;
        if (duration > 10) {
          logger.warn('Audit middleware exceeded 10ms threshold', {
            duration,
            path: req.path,
            method: req.method,
          });
        }
      } catch (error) {
        logger.error('Error cleaning up audit context:', error);
      }
    };

    // Listen for both finish and close events to handle disconnects
    res.once('finish', cleanup);
    res.once('close', cleanup);

    next();
  } catch (error) {
    logger.error('Audit context middleware error:', error);
    // Don't block request on audit context failure
    next();
  }
};

/**
 * Extract client IP address using Express's built-in trusted proxy handling
 */
function getClientIPAddress(req: Request): string | null {
  // Use Express's built-in req.ip which respects the 'trust proxy' setting
  // This automatically handles X-Forwarded-For and other proxy headers securely
  return req.ip || null;
}

/**
 * Generate or extract session ID for tracking user sessions
 */
function generateSessionId(req: Request): string | null {
  // Extract from JWT token payload if available
  if (req.user && 'sessionId' in req.user && req.user.sessionId) {
    return req.user.sessionId as string;
  }

  // Extract from custom headers
  const sessionHeader = req.get('X-Session-ID');
  if (sessionHeader) {
    return sessionHeader;
  }

  return null;
}

// Extend Express Request interface to include audit query runner and entity manager
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auditQueryRunner?: import('typeorm').QueryRunner;
      auditEntityManager?: import('typeorm').EntityManager;
    }
  }
}

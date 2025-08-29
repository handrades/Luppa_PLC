import { NextFunction, Request, Response } from 'express';
import { getAppDataSource } from '../config/database';
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
    if (getAppDataSource()?.isInitialized) {
      const queryRunner = getAppDataSource().createQueryRunner();

      try {
        // Connect the query runner to ensure it has an active connection
        await queryRunner.connect();

        // Always set session variables to prevent stale context from pooled connections
        // Use 'null' string instead of empty string for PostgreSQL session variables
        // Note: SET commands don't support parameterized queries, so we need to escape values manually
        const escapedUserId = queryRunner.manager.connection.driver.escape(userId || 'null');
        const escapedIpAddress = queryRunner.manager.connection.driver.escape(ipAddress || 'null');
        const escapedUserAgent = queryRunner.manager.connection.driver.escape(userAgent || 'null');
        const escapedSessionId = queryRunner.manager.connection.driver.escape(sessionId || 'null');

        await queryRunner.query(`SET app.current_user_id = ${escapedUserId}`);
        await queryRunner.query(`SET app.client_ip = ${escapedIpAddress}`);
        await queryRunner.query(`SET app.user_agent = ${escapedUserAgent}`);
        await queryRunner.query(`SET app.session_id = ${escapedSessionId}`);

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

// Express Request interface augmented in types/express.d.ts

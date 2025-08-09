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
    if (AppDataSource?.manager) {
      const queryRunner = AppDataSource.createQueryRunner();

      try {
        // Set session variables that audit triggers will read using parameterized queries
        if (userId) {
          await queryRunner.query('SET app.current_user_id = $1', [userId]);
        }

        if (ipAddress) {
          await queryRunner.query('SET app.client_ip = $1', [ipAddress]);
        }

        if (userAgent) {
          await queryRunner.query('SET app.user_agent = $1', [userAgent]);
        }

        if (sessionId) {
          await queryRunner.query('SET app.session_id = $1', [sessionId]);
        }

        // Store query runner on request for cleanup
        req.auditQueryRunner = queryRunner;
      } catch (error) {
        // Release query runner on error
        await queryRunner.release();
        throw error;
      }
    }

    // Add cleanup middleware to response finish event
    res.on('finish', async () => {
      try {
        if (req.auditQueryRunner) {
          await req.auditQueryRunner.release();
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
    });

    next();
  } catch (error) {
    logger.error('Audit context middleware error:', error);
    // Don't block request on audit context failure
    next();
  }
};

/**
 * Extract client IP address with support for various proxy headers
 */
function getClientIPAddress(req: Request): string | null {
  const xForwardedFor = req.get('X-Forwarded-For');
  const xRealIP = req.get('X-Real-IP');
  const connectionRemoteAddress = req.connection?.remoteAddress;
  const socketRemoteAddress = req.socket?.remoteAddress;
  const reqIP = req.ip;

  // Handle X-Forwarded-For header (may contain multiple IPs)
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0]; // First IP is the original client
  }

  // Check other headers and properties in order of preference
  return xRealIP || connectionRemoteAddress || socketRemoteAddress || reqIP || null;
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

// Extend Express Request interface to include audit query runner
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auditQueryRunner?: import('typeorm').QueryRunner;
    }
  }
}

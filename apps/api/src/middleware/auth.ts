/**
 * Authentication Middleware
 *
 * Validates JWT tokens and populates req.user with authenticated user information
 */

import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../config/logger';

/**
 * Extend Express Request interface to include user information
 */
// Express Request interface augmented in types/express.d.ts

/**
 * Authentication middleware that validates JWT tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Missing access token',
      });
      return;
    }

    // Validate token using full AuthService
    // auditEntityManager is optional for health checks and non-database operations
    const entityManager = req.auditEntityManager || req.app.locals.AppDataSource?.manager;

    if (!entityManager) {
      logger.warn('No EntityManager available for auth middleware', {
        hasAuditEntityManager: !!req.auditEntityManager,
        hasAppDataSource: !!req.app.locals.AppDataSource,
      });
      throw new Error('EntityManager is required for authentication');
    }

    const authService = new AuthService(entityManager);
    const decoded = await authService.validateToken(token);

    // Populate request with user information
    // Cast the decoded token to the expected user type
    if (typeof decoded === 'object' && 'sub' in decoded) {
      req.user = decoded as typeof req.user;
    } else {
      throw new Error('Invalid token payload');
    }

    next();
  } catch (error) {
    // Log error server-side without exposing internal details
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    logger.warn('Authentication failed', {
      error: errorMessage,
      hasToken: !!token,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    const message = 'Authentication failed'; // Generic message for client

    // Map specific error messages to appropriate status codes
    let statusCode = 401;
    if (message.includes('expired')) {
      statusCode = 401;
    } else if (message.includes('blacklisted') || message.includes('revoked')) {
      statusCode = 401;
    } else if (message.includes('Session not found')) {
      statusCode = 401;
    }

    res.status(statusCode).json({
      error: 'Authentication failed',
      message,
    });
  }
};

/**
 * Optional authentication middleware that doesn't fail if no token is provided
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      next();
      return;
    }

    // Try to validate token, but don't fail if invalid
    const entityManager = req.auditEntityManager || req.app.locals.AppDataSource?.manager;

    if (!entityManager) {
      // Skip optional auth if no EntityManager available
      return next();
    }

    const authService = new AuthService(entityManager);
    try {
      const decoded = await authService.validateToken(token);
      req.user = decoded;
    } catch {
      // Token is invalid, continue without authentication
      req.user = undefined;
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.error('Optional authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    req.user = undefined;
    next();
  }
};

/**
 * Role-based authorization middleware
 * By default, requires ANY of the provided permissions (OR logic)
 */
export const authorize = (requiredPermissions: string[] | string) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Check if user has required permissions
    const userPermissions = req.user.permissions;

    const hasPermission = permissions.some(permission => {
      // Handle both array format ['cells.read'] and object format { cells: { read: true } }
      if (Array.isArray(userPermissions)) {
        // Array format - check if permission exists in array
        return userPermissions.includes(permission);
      } else {
        // Object format - handle dot notation for nested permissions (e.g., 'plc.read')
        const keys = permission.split('.');
        let current: unknown = userPermissions;

        for (const key of keys) {
          if (
            current &&
            typeof current === 'object' &&
            Object.prototype.hasOwnProperty.call(current, key)
          ) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return false;
          }
        }

        return current === true;
      }
    });

    if (!hasPermission) {
      res.status(403).json({
        error: 'Access forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Role-based authorization middleware that requires ALL permissions (AND logic)
 */
export const authorizeAll = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Check if user has ALL required permissions
    const userPermissions = req.user.permissions;

    const hasAllPermissions = requiredPermissions.every(permission => {
      // Handle both array format ['cells.read'] and object format { cells: { read: true } }
      if (Array.isArray(userPermissions)) {
        // Array format - check if permission exists in array
        return userPermissions.includes(permission);
      } else {
        // Object format - handle dot notation for nested permissions (e.g., 'plc.read')
        const keys = permission.split('.');
        let current: unknown = userPermissions;

        for (const key of keys) {
          if (
            current &&
            typeof current === 'object' &&
            Object.prototype.hasOwnProperty.call(current, key)
          ) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return false;
          }
        }

        return current === true;
      }
    });

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Access forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize(['admin']);

/**
 * Active user check middleware
 */
export const requireActiveUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'User not authenticated',
    });
    return;
  }

  try {
    // Verify user is still active in database
    if (!req.auditEntityManager) {
      throw new Error(
        'auditEntityManager is not available on request. Ensure auditContext middleware is registered before auth middleware.'
      );
    }
    const authService = new AuthService(req.auditEntityManager);
    const user = await authService.getUserById(req.user.sub);

    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Account inactive',
        message: 'User account has been deactivated',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify user status',
    });
  }
};

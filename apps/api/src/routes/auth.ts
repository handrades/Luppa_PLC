/**
 * Authentication Routes
 *
 * Provides login and token refresh endpoints with validation and rate limiting
 */

import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { AuthService, LoginCredentials } from '../services/AuthService';
import { authRateLimit, strictAuthRateLimit } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';

const router: Router = Router();

/**
 * Get AuthService with request-scoped EntityManager for session context
 */
const getAuthService = (req: Request): AuthService => {
  return new AuthService(req.auditEntityManager);
};

/**
 * Validation schemas
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().min(8).max(128).required(),
}).unknown(false);

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).unknown(false);

/**
 * POST /auth/login
 * Authenticate user with email and password
 */
router.post('/login', authRateLimit, strictAuthRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        message: error.details.map(detail => detail.message).join('; '),
      });
      return;
    }

    const { email, password } = value as LoginCredentials;

    // Get client information for session tracking
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Attempt login
    const result = await getAuthService(req).login({ email, password }, ipAddress, userAgent);

    // Log successful login
    logger.info('Successful login', {
      userId: result.user.id,
      email,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';

    // Log failed login attempt
    logger.warn('Failed login attempt', {
      email: req.body?.email,
      error: message,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    // Return generic error message to prevent user enumeration
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid credentials',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        message: error.details.map(detail => detail.message).join('; '),
      });
      return;
    }

    const { refreshToken } = value;

    // Get client information
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Refresh tokens
    const newTokens = await getAuthService(req).refreshToken(refreshToken, ipAddress, userAgent);

    logger.info('Token refreshed successfully', {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';

    logger.warn('Token refresh failed', {
      error: message,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Invalid or expired refresh token',
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Extract token ID from JWT if available
    const tokenId = req.user.jti;

    // Logout user
    await getAuthService(req).logout(req.user.sub, tokenId);

    logger.info('User logged out successfully', {
      userId: req.user.sub,
      email: req.user.email,
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';

    logger.error('Logout failed', {
      userId: req.user?.sub,
      error: message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error',
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile information
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      return;
    }

    // Get user information from database
    const user = await getAuthService(req).getUserById(req.user.sub);

    if (!user || !user.isActive) {
      res.status(401).json({
        error: 'Account inactive',
        message: 'User account has been deactivated',
      });
      return;
    }

    // Return user profile
    const userProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    res.status(200).json({
      user: userProfile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get user profile';

    logger.error('Get user profile failed', {
      userId: req.user?.sub,
      error: message,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user profile',
    });
  }
});

/**
 * GET /auth/verify
 * Verify token validity (used by frontend to check auth status)
 */
router.get('/verify', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    valid: true,
    user: {
      id: req.user!.sub,
      email: req.user!.email,
      roleId: req.user!.roleId,
      permissions: req.user!.permissions,
    },
  });
});

export default router;

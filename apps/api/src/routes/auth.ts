/**
 * Authentication Routes
 *
 * Provides login and token refresh endpoints with validation and rate limiting
 */

import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { AuthService, LoginCredentials } from '../services/AuthService';
import { PasswordResetService } from '../services/PasswordResetService';
import { authRateLimit, strictAuthRateLimit } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import {
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  validateSchema,
} from '../validation/userSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
import {
  handleValidationErrorFromMessage,
  sendGenericValidationError,
  sendValidationError,
} from '../utils/validation';

const router: Router = Router();

/**
 * Get AuthService with request-scoped EntityManager for session context
 */
const getAuthService = (req: Request): AuthService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before auth routes.'
    );
  }
  return new AuthService(req.auditEntityManager);
};

/**
 * Get PasswordResetService with request-scoped EntityManager
 */
const getPasswordResetService = (req: Request): PasswordResetService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before auth routes.'
    );
  }
  return new PasswordResetService(req.auditEntityManager);
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
    const { error, value } = loginSchema.validate(req.body, {
      allowUnknown: false,
      abortEarly: false,
    });
    if (error) {
      sendValidationError(res, error);
      return;
    }

    // Type-safe extraction after Joi validation
    const { email, password }: LoginCredentials = value;

    // Additional runtime type checks for safety
    if (typeof email !== 'string' || typeof password !== 'string') {
      sendGenericValidationError(res, 'Email and password must be strings');
      return;
    }

    // Get client information for session tracking
    const ipAddress = getClientIP(req);
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

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
      userAgent: (req.headers['user-agent'] as string) || 'unknown',
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
    const { error, value } = refreshTokenSchema.validate(req.body, {
      allowUnknown: false,
      abortEarly: false,
    });
    if (error) {
      sendValidationError(res, error);
      return;
    }

    const { refreshToken } = value;

    // Get client information
    const ipAddress = getClientIP(req);
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

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
      userAgent: (req.headers['user-agent'] as string) || 'unknown',
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

/**
 * POST /auth/password-reset
 * Request password reset
 */
router.post('/password-reset', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { email } = validateSchema(passwordResetRequestSchema)(req.body);

    const passwordResetService = getPasswordResetService(req);

    // Generate reset token and send email (handles user existence internally for security)
    await passwordResetService.generatePasswordResetToken(email);

    logger.info('Password reset requested', {
      email,
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString(),
    });

    // Always return success to prevent email enumeration attacks
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed';

    // Check for validation errors
    if (handleValidationErrorFromMessage(res, message)) {
      return;
    }

    logger.error('Password reset request failed', {
      email: req.body?.email,
      error: message,
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString(),
    });

    // Always return success to prevent information disclosure
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  }
});

/**
 * POST /auth/password-reset/verify
 * Complete password reset
 */
router.post('/password-reset/verify', authRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { token, newPassword } = validateSchema(passwordResetVerifySchema)(req.body);

    // Early validation: Check token format before processing
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Reset token is required and must be a string',
      });
      return;
    }

    // Validate token format (should be alphanumeric and hyphens for security)
    if (!/^[a-zA-Z0-9\-_]+$/.test(token) || token.length < 16) {
      res.status(400).json({
        error: 'Invalid token',
        message: 'The password reset token format is invalid',
      });
      return;
    }

    const passwordResetService = getPasswordResetService(req);

    // Reset password using token
    const success = await passwordResetService.resetPassword(token, newPassword);

    if (!success) {
      res.status(400).json({
        error: 'Invalid or expired token',
        message: 'The password reset token is invalid or has expired',
      });
      return;
    }

    logger.info('Password reset completed successfully', {
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset verification failed';

    // Check for validation errors
    if (handleValidationErrorFromMessage(res, message)) {
      return;
    }

    logger.error('Password reset verification failed', {
      error: message,
      ipAddress: getClientIP(req),
      timestamp: new Date().toISOString(),
    });

    res.status(400).json({
      error: 'Password reset failed',
      message: 'Invalid or expired reset token',
    });
  }
});

export default router;

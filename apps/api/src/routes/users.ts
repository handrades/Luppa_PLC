/**
 * User Management Routes
 *
 * Provides comprehensive user CRUD operations with authentication, authorization,
 * and audit logging integration.
 */

import { Request, Response, Router } from 'express';
import { UserService } from '../services/UserService';
import { authenticate, authorize } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';
import {
  assignRoleSchema,
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  userSearchSchema,
  validateSchema,
} from '../validation/userSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
// Centralized error handling utilities available for future use
// import { handleRouteError, ValidationError } from '../utils/errorHandler';

const router: Router = Router();

/**
 * Get UserService with request-scoped EntityManager for audit context
 */
const getUserService = (req: Request): UserService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before user routes.'
    );
  }
  return new UserService(req.auditEntityManager);
};

/**
 * POST /users
 * Create new user account
 */
router.post(
  '/',
  authenticate,
  authorize(['users.create']),
  authRateLimit,
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      const userData = validateSchema(createUserSchema)(req.body);

      const userService = getUserService(req);
      const user = await userService.createUser(userData);

      // Remove password hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { passwordHash, ...userResponse } = user;

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
        createdBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(201).json({
        message: 'User created successfully',
        user: userResponse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create user';

      // Check for validation errors
      if (message.includes('Validation failed')) {
        try {
          const validationError = JSON.parse(message);
          res.status(400).json({
            error: 'Validation error',
            message: validationError.message,
            errors: validationError.errors,
          });
        } catch {
          // Handle plain string validation errors
          res.status(400).json({
            error: 'Validation error',
            message: message,
            errors: [],
          });
        }
        return;
      }

      // Check for specific business errors
      if (message === 'Email address already exists') {
        res.status(409).json({
          error: 'Conflict',
          message: 'Email address is already in use',
        });
        return;
      }

      if (message === 'Default Engineer role not found' || message === 'Role not found') {
        res.status(400).json({
          error: 'Invalid role',
          message: 'Specified role does not exist',
        });
        return;
      }

      logger.error('Failed to create user', {
        error: message,
        createdBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create user',
      });
    }
  }
);

/**
 * GET /users
 * List users with filtering and pagination
 */
router.get('/', authenticate, authorize(['users.read']), async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const filters = validateSchema(userSearchSchema)(req.query);

    const userService = getUserService(req);
    const result = await userService.searchUsers(filters);

    // Remove password hashes from response
    const usersResponse = result.data.map(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { passwordHash, ...userResponse } = user;
      return userResponse;
    });

    res.status(200).json({
      data: usersResponse,
      pagination: result.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';

    // Check for validation errors
    if (message.includes('Validation failed')) {
      const validationError = JSON.parse(message);
      res.status(400).json({
        error: 'Validation error',
        message: validationError.message,
        errors: validationError.errors,
      });
      return;
    }

    logger.error('Failed to fetch users', {
      error: message,
      requestedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch users',
    });
  }
});

/**
 * GET /users/stats
 * Get user statistics (for admin dashboard)
 */
router.get(
  '/stats',
  authenticate,
  authorize(['users.read']),
  async (req: Request, res: Response) => {
    try {
      const userService = getUserService(req);
      const stats = await userService.getUserStats();

      res.status(200).json({
        stats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user statistics';

      logger.error('Failed to fetch user statistics', {
        error: message,
        requestedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch user statistics',
      });
    }
  }
);

/**
 * GET /users/:id
 * Get specific user details
 */
router.get('/:id', authenticate, authorize(['users.read']), async (req: Request, res: Response) => {
  try {
    // Validate parameters
    const { id } = validateSchema(userIdParamSchema)(req.params);

    const userService = getUserService(req);
    const user = await userService.getUserById(id);

    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found',
      });
      return;
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const { passwordHash, ...userResponse } = user;

    res.status(200).json({
      user: userResponse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';

    // Check for validation errors
    if (message.includes('Validation failed')) {
      const validationError = JSON.parse(message);
      res.status(400).json({
        error: 'Validation error',
        message: validationError.message,
        errors: validationError.errors,
      });
      return;
    }

    logger.error('Failed to fetch user', {
      error: message,
      userId: req.params.id,
      requestedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user',
    });
  }
});

/**
 * PUT /users/:id
 * Update user profile
 */
router.put(
  '/:id',
  authenticate,
  authorize(['users.update']),
  async (req: Request, res: Response) => {
    try {
      // Validate parameters and body
      const { id } = validateSchema(userIdParamSchema)(req.params);
      const updateData = validateSchema(updateUserSchema)(req.body);

      const userService = getUserService(req);
      const updatedBy = `${req.user?.email} (${req.user?.sub})`;

      const user = await userService.updateUser(id, updateData, updatedBy);

      // Remove password hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { passwordHash, ...userResponse } = user;

      logger.info('User updated successfully', {
        userId: id,
        updatedFields: Object.keys(updateData),
        updatedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: 'User updated successfully',
        user: userResponse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';

      // Check for validation errors
      if (message.includes('Validation failed')) {
        try {
          const validationError = JSON.parse(message);
          res.status(400).json({
            error: 'Validation error',
            message: validationError.message,
            errors: validationError.errors,
          });
        } catch {
          // Handle plain string validation errors
          res.status(400).json({
            error: 'Validation error',
            message: message,
            errors: [],
          });
        }
        return;
      }

      // Check for specific business errors
      if (message === 'User not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      if (message === 'New role not found') {
        res.status(400).json({
          error: 'Invalid role',
          message: 'Specified role does not exist',
        });
        return;
      }

      logger.error('Failed to update user', {
        error: message,
        userId: req.params.id,
        updatedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update user',
      });
    }
  }
);

/**
 * DELETE /users/:id
 * Soft delete user account
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['users.delete']),
  async (req: Request, res: Response) => {
    try {
      // Validate parameters
      const { id } = validateSchema(userIdParamSchema)(req.params);

      const userService = getUserService(req);
      const deletedBy = `${req.user?.email} (${req.user?.sub})`;

      await userService.softDeleteUser(id, deletedBy);

      logger.info('User soft deleted successfully', {
        userId: id,
        deletedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';

      // Check for validation errors
      if (message.includes('Validation failed')) {
        try {
          const validationError = JSON.parse(message);
          res.status(400).json({
            error: 'Validation error',
            message: validationError.message,
            errors: validationError.errors,
          });
        } catch {
          // Handle plain string validation errors
          res.status(400).json({
            error: 'Validation error',
            message: message,
            errors: [],
          });
        }
        return;
      }

      // Check for specific business errors
      if (message === 'User not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      if (message === 'User is already inactive') {
        res.status(400).json({
          error: 'Bad request',
          message: 'User is already inactive',
        });
        return;
      }

      logger.error('Failed to delete user', {
        error: message,
        userId: req.params.id,
        deletedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete user',
      });
    }
  }
);

/**
 * POST /users/:id/roles
 * Assign role to user
 */
router.post(
  '/:id/roles',
  authenticate,
  authorize(['users.update']),
  async (req: Request, res: Response) => {
    try {
      // Validate parameters and body
      const { id } = validateSchema(userIdParamSchema)(req.params);
      const { roleId, reason } = validateSchema(assignRoleSchema)(req.body);

      const userService = getUserService(req);
      const assignedBy = `${req.user?.email} (${req.user?.sub})`;

      const user = await userService.assignRole(id, roleId, assignedBy, reason);

      // Remove password hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { passwordHash, ...userResponse } = user;

      logger.info('Role assigned successfully', {
        userId: id,
        newRoleId: roleId,
        assignedBy: req.user?.sub,
        reason,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: 'Role assigned successfully',
        user: userResponse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign role';

      // Check for validation errors
      if (message.includes('Validation failed')) {
        try {
          const validationError = JSON.parse(message);
          res.status(400).json({
            error: 'Validation error',
            message: validationError.message,
            errors: validationError.errors,
          });
        } catch {
          // Handle plain string validation errors
          res.status(400).json({
            error: 'Validation error',
            message: message,
            errors: [],
          });
        }
        return;
      }

      // Check for specific business errors
      if (message === 'User not found') {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
        });
        return;
      }

      if (message === 'Role not found') {
        res.status(400).json({
          error: 'Invalid role',
          message: 'Specified role does not exist',
        });
        return;
      }

      if (message === 'User already has this role') {
        res.status(400).json({
          error: 'Bad request',
          message: 'User already has this role',
        });
        return;
      }

      logger.error('Failed to assign role', {
        error: message,
        userId: req.params.id,
        roleId: req.body.roleId,
        assignedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to assign role',
      });
    }
  }
);

export default router;

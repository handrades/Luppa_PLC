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
import { asyncHandler } from '../utils/errorHandler';

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
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to create user')
);

/**
 * GET /users
 * List users with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  authorize(['users.read']),
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to fetch users')
);

/**
 * GET /users/stats
 * Get user statistics (for admin dashboard)
 */
router.get(
  '/stats',
  authenticate,
  authorize(['users.read']),
  asyncHandler(async (req: Request, res: Response) => {
    const userService = getUserService(req);
    const stats = await userService.getUserStats();

    res.status(200).json({
      stats,
    });
  }, 'Failed to fetch user statistics')
);

/**
 * GET /users/:id
 * Get specific user details
 */
router.get(
  '/:id',
  authenticate,
  authorize(['users.read']),
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to fetch user')
);

/**
 * PUT /users/:id
 * Update user profile
 */
router.put(
  '/:id',
  authenticate,
  authorize(['users.update']),
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to update user')
);

/**
 * DELETE /users/:id
 * Soft delete user account
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['users.delete']),
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to delete user')
);

/**
 * POST /users/:id/roles
 * Assign role to user
 */
router.post(
  '/:id/roles',
  authenticate,
  authorize(['users.update']),
  asyncHandler(async (req: Request, res: Response) => {
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
  }, 'Failed to assign role')
);

export default router;

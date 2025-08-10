/**
 * User Service
 *
 * Business logic layer for all user operations including CRUD operations,
 * role management, password resets, and comprehensive user search functionality.
 */

import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import {
  PaginatedResponse,
  UserRepository,
  UserSearchFilters,
} from '../repositories/UserRepository';
import { AuthService } from './AuthService';
import { PasswordResetService } from './PasswordResetService';
import { EmailNotificationService } from './EmailNotificationService';
import { logger } from '../config/logger';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UserWithRole extends User {
  role: Role;
}

export class UserService {
  private userRepository: UserRepository;
  private authService: AuthService;
  private passwordResetService: PasswordResetService;
  private emailService: EmailNotificationService;
  private manager: EntityManager;

  constructor(entityManager?: EntityManager) {
    this.manager = entityManager || AppDataSource.manager;

    if (!this.manager) {
      throw new Error('EntityManager is required for UserService initialization');
    }

    this.userRepository = new UserRepository();
    this.authService = new AuthService(this.manager);
    this.passwordResetService = new PasswordResetService(this.manager);
    this.emailService = new EmailNotificationService();
  }

  /**
   * Create a new user with password hashing and email validation
   */
  async createUser(userData: CreateUserInput): Promise<UserWithRole> {
    const { email, password, firstName, lastName, roleId, isActive = true } = userData;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(normalizedEmail);
    if (emailExists) {
      throw new Error('Email address already exists');
    }

    // Get default role if not specified
    let finalRoleId = roleId;
    if (!roleId) {
      const engineerRole = await this.manager.getRepository(Role).findOne({
        where: { name: 'Engineer' },
      });
      if (!engineerRole) {
        throw new Error('Default Engineer role not found');
      }
      finalRoleId = engineerRole.id;
    } else {
      // Verify role exists
      const role = await this.manager.getRepository(Role).findOne({
        where: { id: roleId },
      });
      if (!role) {
        throw new Error('Role not found');
      }
    }

    // Hash password
    const passwordHash = await this.authService.hashPassword(password);

    // Create user
    const user = await this.userRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roleId: finalRoleId,
      isActive,
    });

    // Fetch user with role for return
    const userWithRole = await this.userRepository.findWithRole(user.id);
    if (!userWithRole) {
      throw new Error('Failed to retrieve created user');
    }

    // Send account creation notification (async, don't wait)
    this.emailService
      .sendAccountCreationNotification({
        user: userWithRole,
      })
      .catch(error => {
        logger.error('Failed to send account creation notification', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
      roleId: finalRoleId,
    });

    return userWithRole as UserWithRole;
  }

  /**
   * Get user by ID with role information
   */
  async getUserById(id: string): Promise<UserWithRole | null> {
    const user = await this.userRepository.findWithRole(id);
    return user as UserWithRole | null;
  }

  /**
   * Update user profile information
   */
  async updateUser(
    id: string,
    updateData: UpdateUserInput,
    updatedBy?: string
  ): Promise<UserWithRole> {
    const user = await this.userRepository.findWithRole(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Store original role for notification
    const originalRole = user.role;

    // If updating role, verify new role exists
    if (updateData.roleId && updateData.roleId !== user.roleId) {
      const newRole = await this.manager.getRepository(Role).findOne({
        where: { id: updateData.roleId },
      });
      if (!newRole) {
        throw new Error('New role not found');
      }
    }

    // Update user
    const updatedUser = await this.userRepository.updateUser(id, updateData);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    // Send role assignment notification if role changed
    if (updateData.roleId && updateData.roleId !== originalRole.id) {
      const newRole = await this.manager.getRepository(Role).findOne({
        where: { id: updateData.roleId },
      });

      if (newRole) {
        this.emailService
          .sendRoleAssignmentNotification({
            user: updatedUser,
            oldRole: originalRole,
            newRole,
            assignedBy: updatedBy || 'System',
          })
          .catch(error => {
            logger.error('Failed to send role assignment notification', {
              userId: id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
      }
    }

    // Send account deactivation notification if user was deactivated
    if (updateData.isActive === false && user.isActive) {
      this.emailService
        .sendAccountDeactivationNotification(updatedUser, updatedBy || 'System')
        .catch(error => {
          logger.error('Failed to send account deactivation notification', {
            userId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
    }

    logger.info('User updated successfully', {
      userId: id,
      updatedFields: Object.keys(updateData),
      updatedBy,
    });

    return updatedUser as UserWithRole;
  }

  /**
   * Soft delete user (set isActive to false)
   */
  async softDeleteUser(id: string, deletedBy?: string): Promise<void> {
    const user = await this.userRepository.findWithRole(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User is already inactive');
    }

    await this.userRepository.softDeleteUser(id);

    // Send deactivation notification
    this.emailService
      .sendAccountDeactivationNotification(user, deletedBy || 'System')
      .catch(error => {
        logger.error('Failed to send account deactivation notification', {
          userId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    logger.info('User soft deleted successfully', {
      userId: id,
      email: user.email,
      deletedBy,
    });
  }

  /**
   * Assign role to user with permission validation
   */
  async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    reason?: string
  ): Promise<UserWithRole> {
    const user = await this.userRepository.findWithRole(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newRole = await this.manager.getRepository(Role).findOne({
      where: { id: roleId },
    });
    if (!newRole) {
      throw new Error('Role not found');
    }

    if (user.roleId === roleId) {
      throw new Error('User already has this role');
    }

    const originalRole = user.role;

    // Update user role
    const updatedUser = await this.userRepository.updateUser(userId, { roleId });
    if (!updatedUser) {
      throw new Error('Failed to assign role');
    }

    // Send role assignment notification
    this.emailService
      .sendRoleAssignmentNotification({
        user: updatedUser,
        oldRole: originalRole,
        newRole,
        assignedBy,
        reason,
      })
      .catch(error => {
        logger.error('Failed to send role assignment notification', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    logger.info('Role assigned successfully', {
      userId,
      oldRoleId: originalRole.id,
      newRoleId: roleId,
      assignedBy,
      reason,
    });

    return updatedUser as UserWithRole;
  }

  /**
   * Search users with advanced filtering and pagination
   */
  async searchUsers(filters: UserSearchFilters): Promise<PaginatedResponse<UserWithRole>> {
    const result = await this.userRepository.searchUsersWithPagination(filters);

    return {
      data: result.data as UserWithRole[],
      pagination: result.pagination,
    };
  }

  /**
   * Generate password reset token for user
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    return this.passwordResetService.generatePasswordResetToken(email);
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<boolean> {
    const tokenData = await this.passwordResetService.validatePasswordResetToken(token);
    return !!tokenData;
  }

  /**
   * Reset user password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const success = await this.passwordResetService.resetPassword(token, newPassword);

    if (success) {
      // Get token data to identify user for notification
      const tokenData = await this.passwordResetService.validatePasswordResetToken(token);
      if (tokenData) {
        const user = await this.userRepository.findWithRole(tokenData.userId);
        if (user) {
          // Send password change notification
          this.emailService
            .sendPasswordChangeNotification({
              user,
              changedBy: 'password reset',
            })
            .catch(error => {
              logger.error('Failed to send password change notification', {
                userId: user.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            });
        }
      }
    }

    return success;
  }

  /**
   * Change user password (requires current password verification)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.findWithRole(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.authService.verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Prevent setting the same password
    const isSamePassword = await this.authService.verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await this.authService.hashPassword(newPassword);

    // Update password
    await this.userRepository.updateUser(userId, { passwordHash: newPasswordHash });

    // Send password change notification
    this.emailService
      .sendPasswordChangeNotification({
        user,
      })
      .catch(error => {
        logger.error('Failed to send password change notification', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Get users by role
   */
  async getUsersByRole(roleId: string): Promise<UserWithRole[]> {
    const users = await this.userRepository.findActiveUsersByRole(roleId);
    return users as UserWithRole[];
  }

  /**
   * Check if email is available (not taken by another user)
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const exists = await this.userRepository.emailExists(email, excludeUserId);
    return !exists;
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: { roleId: string; roleName: string; count: number }[];
  }> {
    const allUsers = await this.userRepository.findAllWithRole();

    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => user.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;

    // Group by role
    const roleMap = new Map<string, { roleName: string; count: number }>();
    allUsers.forEach(user => {
      if (user.role) {
        const existing = roleMap.get(user.role.id) || { roleName: user.role.name, count: 0 };
        existing.count++;
        roleMap.set(user.role.id, existing);
      }
    });

    const usersByRole = Array.from(roleMap.entries()).map(([roleId, data]) => ({
      roleId,
      roleName: data.roleName,
      count: data.count,
    }));

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
    };
  }

  /**
   * Bulk operations helper - activate/deactivate multiple users
   */
  async bulkUpdateUserStatus(
    userIds: string[],
    isActive: boolean,
    updatedBy?: string
  ): Promise<void> {
    const updates = userIds.map(async userId => {
      try {
        await this.updateUser(userId, { isActive }, updatedBy);
      } catch (error) {
        logger.error('Failed to update user in bulk operation', {
          userId,
          isActive,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    await Promise.allSettled(updates);

    logger.info('Bulk user status update completed', {
      userIds,
      isActive,
      updatedBy,
    });
  }
}

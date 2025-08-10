/**
 * UserService Tests
 *
 * Unit tests for UserService business logic including CRUD operations,
 * role management, and password reset functionality.
 */

// Set environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes';

// Mock dependencies first
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    manager: {
      getRepository: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    },
  },
}));

jest.mock('../../repositories/UserRepository');
jest.mock('../../services/AuthService');
jest.mock('../../services/PasswordResetService');
jest.mock('../../services/EmailNotificationService');

import { UserService } from '../../services/UserService';
import { UserRepository } from '../../repositories/UserRepository';
import { AuthService } from '../../services/AuthService';
import { PasswordResetService } from '../../services/PasswordResetService';
import { EmailNotificationService } from '../../services/EmailNotificationService';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { EntityManager } from 'typeorm';
import { Role } from '../../entities/Role';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockPasswordResetService: jest.Mocked<PasswordResetService>;
  let mockEmailService: jest.Mocked<EmailNotificationService>;
  let mockRoleRepository: jest.Mocked<{ findOne: jest.Mock }>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    roleId: 'role-456',
    isActive: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-456',
      name: 'Engineer',
      permissions: { users: { read: true } },
      description: 'Engineer role',
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [],
    },
  } as User;

  const mockRole: Role = {
    id: 'role-789',
    name: 'Admin',
    permissions: { users: { read: true, create: true, update: true, delete: true } },
    description: 'Admin role',
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockUserRepository = {
      emailExists: jest.fn(),
      createUser: jest.fn(),
      findWithRole: jest.fn(),
      updateUser: jest.fn(),
      softDeleteUser: jest.fn(),
      searchUsersWithPagination: jest.fn(),
      findActiveUsersByRole: jest.fn(),
      findAllWithRole: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockAuthService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockPasswordResetService = {
      generatePasswordResetToken: jest.fn(),
      validatePasswordResetToken: jest.fn(),
      resetPassword: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetService>;

    mockEmailService = {
      sendAccountCreationNotification: jest.fn().mockResolvedValue(undefined),
      sendRoleAssignmentNotification: jest.fn().mockResolvedValue(undefined),
      sendAccountDeactivationNotification: jest.fn().mockResolvedValue(undefined),
      sendPasswordChangeNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailNotificationService>;

    mockRoleRepository = {
      findOne: jest.fn(),
    };

    // Mock constructors
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepository);
    (AuthService as jest.Mock).mockImplementation(() => mockAuthService);
    (PasswordResetService as jest.Mock).mockImplementation(() => mockPasswordResetService);
    (EmailNotificationService as jest.Mock).mockImplementation(() => mockEmailService);

    // Mock AppDataSource manager
    (AppDataSource.manager.getRepository as jest.Mock).mockImplementation(entity => {
      if (entity === Role) {
        return mockRoleRepository;
      }
      return mockUserRepository;
    });

    // Create a mock EntityManager for testing
    const mockEntityManager = {
      getRepository: jest.fn().mockImplementation(entity => {
        if (entity.name === 'Role') {
          return mockRoleRepository;
        }
        return mockUserRepository;
      }),
    } as unknown as EntityManager;

    userService = new UserService(mockEntityManager);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-456',
        isActive: true,
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockRoleRepository.findOne.mockResolvedValue(mockUser.role);
      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockEmailService.sendAccountCreationNotification.mockResolvedValue();

      const result = await userService.createUser(userData);

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Password123');
      expect(mockUserRepository.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-456',
        isActive: true,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Email address already exists'
      );
    });

    it('should use default Engineer role if none specified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const engineerRole = { id: 'engineer-role', name: 'Engineer' };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockRoleRepository.findOne.mockResolvedValue(engineerRole);
      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockUserRepository.createUser.mockResolvedValue({ ...mockUser, roleId: 'engineer-role' });
      mockUserRepository.findWithRole.mockResolvedValue({ ...mockUser, roleId: 'engineer-role' });

      await userService.createUser(userData);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Engineer' },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user with role information', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(mockUserRepository.findWithRole).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(null);

      const result = await userService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = { firstName: 'Jane' };
      const updatedUser = { ...mockUser, firstName: 'Jane' };

      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await userService.updateUser('user-123', updateData, 'admin@example.com');

      expect(mockUserRepository.findWithRole).toHaveBeenCalledWith('user-123');
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-123', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(null);

      await expect(userService.updateUser('nonexistent', { firstName: 'Jane' })).rejects.toThrow(
        'User not found'
      );
    });

    it('should send role assignment notification when role changes', async () => {
      const updateData = { roleId: 'new-role-id' };
      const updatedUser = { ...mockUser, roleId: 'new-role-id' };

      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);
      mockEmailService.sendRoleAssignmentNotification.mockResolvedValue();

      await userService.updateUser('user-123', updateData, 'admin@example.com');

      expect(mockEmailService.sendRoleAssignmentNotification).toHaveBeenCalledWith({
        user: updatedUser,
        oldRole: mockUser.role,
        newRole: mockRole,
        assignedBy: 'admin@example.com',
      });
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user successfully', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockUserRepository.softDeleteUser.mockResolvedValue();
      mockEmailService.sendAccountDeactivationNotification.mockResolvedValue();

      await userService.softDeleteUser('user-123', 'admin@example.com');

      expect(mockUserRepository.softDeleteUser).toHaveBeenCalledWith('user-123');
      expect(mockEmailService.sendAccountDeactivationNotification).toHaveBeenCalledWith(
        mockUser,
        'admin@example.com'
      );
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(null);

      await expect(userService.softDeleteUser('nonexistent')).rejects.toThrow('User not found');
    });

    it('should throw error if user is already inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findWithRole.mockResolvedValue(inactiveUser);

      await expect(userService.softDeleteUser('user-123')).rejects.toThrow(
        'User is already inactive'
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role successfully', async () => {
      const updatedUser = { ...mockUser, roleId: 'role-789' };

      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);
      mockEmailService.sendRoleAssignmentNotification.mockResolvedValue();

      const result = await userService.assignRole(
        'user-123',
        'role-789',
        'admin@example.com',
        'Promotion'
      );

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-123', {
        roleId: 'role-789',
      });
      expect(result).toEqual(updatedUser);
      expect(mockEmailService.sendRoleAssignmentNotification).toHaveBeenCalledWith({
        user: updatedUser,
        oldRole: mockUser.role,
        newRole: mockRole,
        assignedBy: 'admin@example.com',
        reason: 'Promotion',
      });
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(null);

      await expect(userService.assignRole('nonexistent', 'role-789', 'admin')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error if role not found', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(userService.assignRole('user-123', 'nonexistent', 'admin')).rejects.toThrow(
        'Role not found'
      );
    });

    it('should throw error if user already has the role', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(mockUser.role);

      await expect(userService.assignRole('user-123', 'role-456', 'admin')).rejects.toThrow(
        'User already has this role'
      );
    });
  });

  describe('searchUsers', () => {
    it('should return paginated user results', async () => {
      const filters = { search: 'john', page: 1, pageSize: 10 };
      const mockResult = {
        data: [mockUser],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockUserRepository.searchUsersWithPagination.mockResolvedValue(mockResult);

      const result = await userService.searchUsers(filters);

      expect(mockUserRepository.searchUsersWithPagination).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResult);
    });
  });

  describe('password reset functionality', () => {
    it('should generate password reset token', async () => {
      const token = 'reset-token-123';
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(token);

      const result = await userService.generatePasswordResetToken('test@example.com');

      expect(mockPasswordResetService.generatePasswordResetToken).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(result).toBe(token);
    });

    it('should validate password reset token', async () => {
      const tokenData = {
        token: 'token-123',
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: new Date(),
      };
      mockPasswordResetService.validatePasswordResetToken.mockResolvedValue(tokenData);

      const result = await userService.validatePasswordResetToken('token-123');

      expect(result).toBe(true);
    });

    it('should reset password successfully', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(true);
      mockPasswordResetService.validatePasswordResetToken.mockResolvedValue({
        token: 'token-123',
        userId: 'user-123',
        email: 'test@example.com',
        expiresAt: new Date(),
      });
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordChangeNotification.mockResolvedValue();

      const result = await userService.resetPassword('token-123', 'NewPassword123');

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
        'token-123',
        'NewPassword123'
      );
      expect(result).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword
        .mockResolvedValueOnce(true) // Current password verification
        .mockResolvedValueOnce(false); // New password comparison (different from current)
      mockAuthService.hashPassword.mockResolvedValue('new-hashed-password');
      mockUserRepository.updateUser.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordChangeNotification.mockResolvedValue();

      await userService.changePassword('user-123', 'currentPassword', 'newPassword');

      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'currentPassword',
        mockUser.passwordHash
      );
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('newPassword');
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-123', {
        passwordHash: 'new-hashed-password',
      });
    });

    it('should throw error if current password is incorrect', async () => {
      mockUserRepository.findWithRole.mockResolvedValue(mockUser);
      mockAuthService.verifyPassword.mockResolvedValue(false);

      await expect(
        userService.changePassword('user-123', 'wrongPassword', 'newPassword')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-2', isActive: false }];

      mockUserRepository.findAllWithRole.mockResolvedValue(users);

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 2,
        activeUsers: 1,
        inactiveUsers: 1,
        usersByRole: [
          {
            roleId: 'role-456',
            roleName: 'Engineer',
            count: 2,
          },
        ],
      });
    });
  });

  describe('isEmailAvailable', () => {
    it('should return true if email is available', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);

      const result = await userService.isEmailAvailable('new@example.com');

      expect(result).toBe(true);
      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('new@example.com', undefined);
    });

    it('should return false if email is taken', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      const result = await userService.isEmailAvailable('existing@example.com');

      expect(result).toBe(false);
    });

    it('should exclude specific user ID when checking availability', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);

      const result = await userService.isEmailAvailable('test@example.com', 'user-123');

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('test@example.com', 'user-123');
      expect(result).toBe(true);
    });
  });
});

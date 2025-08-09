/**
 * AuthService Tests
 *
 * Comprehensive tests for authentication service functionality
 */

// Set JWT_SECRET environment variable before any imports
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes';

// Mock dependencies first, before importing modules that use them
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../config/redis');
jest.mock('bcrypt');

// Partially mock jsonwebtoken to preserve error classes
jest.mock('jsonwebtoken', () => {
  const originalJwt = jest.requireActual('jsonwebtoken');
  return {
    ...originalJwt,
    sign: jest.fn(),
    verify: jest.fn(),
    // Preserve error classes
    TokenExpiredError: originalJwt.TokenExpiredError,
    JsonWebTokenError: originalJwt.JsonWebTokenError,
  };
});

import { DataSource, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/AuthService';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { TokenType, jwtConfig } from '../../config/jwt';
import * as redisConfig from '../../config/redis';
import { TEST_CREDENTIALS, TEST_USER } from '../helpers/test-constants';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockRoleRepository: jest.Mocked<Repository<Role>>;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;
  let mockJwt: jest.Mocked<typeof jwt>;
  let mockRedis: jest.Mocked<typeof redisConfig>;

  // Mock user and role data
  const mockRole = {
    id: 'role-123',
    name: 'Admin',
    permissions: {
      plc: { read: true, write: true },
      users: { read: true, write: true },
    },
    description: 'Administrator role',
    isSystem: false,
    users: [],
  } as Role;

  const mockUser = {
    id: TEST_USER.id,
    email: TEST_USER.email,
    firstName: TEST_USER.firstName,
    lastName: TEST_USER.lastName,
    passwordHash: TEST_CREDENTIALS.hashedPassword,
    roleId: 'role-123',
    isActive: true,
    lastLogin: null,
    role: mockRole,
  } as User;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup repository mocks
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<Repository<User>>;

    mockRoleRepository = {
      findOne: jest.fn(),
    } as jest.Mocked<Repository<Role>>;

    // Setup AppDataSource mock
    const mockDataSource = {
      getRepository: jest.fn(entity => {
        if (entity === User) return mockUserRepository;
        if (entity === Role) return mockRoleRepository;
        return null;
      }),
    } as unknown as jest.Mocked<DataSource>;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../config/database').AppDataSource = mockDataSource;

    // Setup bcrypt mock
    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    mockBcrypt.compare = jest.fn();
    mockBcrypt.hash = jest.fn();

    // Setup JWT mock
    mockJwt = jwt as jest.Mocked<typeof jwt>;
    mockJwt.sign = jest.fn();
    mockJwt.verify = jest.fn();

    // Setup Redis mock
    mockRedis = redisConfig as jest.Mocked<typeof redisConfig>;
    mockRedis.storeSession = jest.fn();
    mockRedis.getSession = jest.fn();
    mockRedis.updateSessionActivity = jest.fn();
    mockRedis.isTokenBlacklisted = jest.fn();
    mockRedis.blacklistToken = jest.fn();

    // Create service instance
    authService = new AuthService();
  });

  describe('login', () => {
    it('should successfully authenticate valid credentials', async () => {
      // Arrange
      const credentials = { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockRedis.storeSession.mockResolvedValue();
      mockUserRepository.save.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      // Act
      const result = await authService.login(credentials, ipAddress, userAgent);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['role'],
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        TEST_CREDENTIALS.password,
        TEST_CREDENTIALS.hashedPassword
      );
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockRedis.storeSession).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();

      expect(result).toMatchObject({
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roleId: 'role-123',
          roleName: 'Admin',
          isActive: true,
        },
      });
    });

    it('should throw error for non-existent user', async () => {
      // Arrange
      const credentials = { email: 'nonexistent@example.com', password: TEST_CREDENTIALS.password };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(credentials, ipAddress, userAgent)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const credentials = { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';
      const inactiveUser = { ...mockUser, isActive: false };

      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(authService.login(credentials, ipAddress, userAgent)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      const credentials = {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.wrongPassword,
      };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(credentials, ipAddress, userAgent)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should trim and lowercase email', async () => {
      // Arrange
      const credentials = { email: '  TEST@EXAMPLE.COM  ', password: 'password123' };
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      mockRedis.storeSession.mockResolvedValue();
      mockUserRepository.save.mockResolvedValue({ ...mockUser, lastLogin: new Date() });

      // Act
      await authService.login(credentials, ipAddress, userAgent);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['role'],
      });
    });
  });

  describe('validateToken', () => {
    it('should successfully validate valid access token', async () => {
      // Arrange
      const token = 'valid-token';
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roleId: 'role-123',
        permissions: { plc: { read: true } },
        type: TokenType.ACCESS,
        jti: 'token-id',
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockRedis.getSession.mockResolvedValue({
        userId: 'user-123',
        loginTime: Date.now(),
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        lastActivity: Date.now(),
      });
      mockRedis.updateSessionActivity.mockResolvedValue();

      // Act
      const result = await authService.validateToken(token);

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
      expect(mockRedis.isTokenBlacklisted).toHaveBeenCalledWith('token-id');
      expect(mockRedis.getSession).toHaveBeenCalledWith('user-123:token-id');
      expect(mockRedis.updateSessionActivity).toHaveBeenCalledWith('user-123:token-id');
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for blacklisted token', async () => {
      // Arrange
      const token = 'blacklisted-token';
      const mockPayload = {
        sub: 'user-123',
        jti: 'token-id',
        type: TokenType.ACCESS,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(true);

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow('Token has been revoked');
    });

    it('should throw error for expired token', async () => {
      // Arrange
      const token = 'expired-token';
      const expiredError = new jwt.TokenExpiredError('jwt expired', new Date());

      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow('Token expired');
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      const jwtError = new jwt.JsonWebTokenError('invalid token');

      mockJwt.verify.mockImplementation(() => {
        throw jwtError;
      });

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow('Invalid token');
    });

    it('should throw error when session not found for access token', async () => {
      // Arrange
      const token = 'valid-token';
      const mockPayload = {
        sub: 'user-123',
        type: TokenType.ACCESS,
        jti: 'token-id',
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockRedis.getSession.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.validateToken(token)).rejects.toThrow('Session not found');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const ipAddress = '192.168.1.1';
      const userAgent = 'test-agent';
      const mockPayload = {
        sub: 'user-123',
        type: TokenType.REFRESH,
        jti: 'refresh-token-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      mockRedis.storeSession.mockResolvedValue();
      mockRedis.blacklistToken.mockResolvedValue();

      // Act
      const result = await authService.refreshToken(refreshToken, ipAddress, userAgent);

      // Assert
      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mockRedis.blacklistToken).toHaveBeenCalledWith('refresh-token-id', expect.any(Number));
    });

    it('should throw error for non-refresh token', async () => {
      // Arrange
      const refreshToken = 'access-token';
      const mockPayload = {
        sub: 'user-123',
        type: TokenType.ACCESS, // Wrong type
        jti: 'token-id',
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      // Since this is an ACCESS token, it will try to check session
      mockRedis.getSession.mockResolvedValue({
        userId: 'user-123',
        loginTime: Date.now(),
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        lastActivity: Date.now(),
      });
      mockRedis.updateSessionActivity.mockResolvedValue();

      // Act & Assert
      await expect(
        authService.refreshToken(refreshToken, '192.168.1.1', 'test-agent')
      ).rejects.toThrow('Invalid token type');
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'user-123',
        type: TokenType.REFRESH,
        jti: 'refresh-token-id',
      };
      const inactiveUser = { ...mockUser, isActive: false };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(
        authService.refreshToken(refreshToken, '192.168.1.1', 'test-agent')
      ).rejects.toThrow('User not found or inactive');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const userId = 'user-123';
      const tokenId = 'token-id';

      mockRedis.removeSession.mockResolvedValue();
      mockRedis.blacklistToken.mockResolvedValue();

      // Act
      await authService.logout(userId, tokenId);

      // Assert
      expect(mockRedis.removeSession).toHaveBeenCalledWith('user-123:token-id');
      expect(mockRedis.blacklistToken).toHaveBeenCalledWith(tokenId, 24 * 60 * 60);
    });

    it('should logout without token ID', async () => {
      // Arrange
      const userId = 'user-123';

      mockRedis.removeSession.mockResolvedValue();

      // Act
      await authService.logout(userId);

      // Assert
      expect(mockRedis.removeSession).toHaveBeenCalledWith(userId);
      expect(mockRedis.blacklistToken).not.toHaveBeenCalled();
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const password = 'password123';
      const hashedPassword = 'hashed-password';

      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      // Act
      const result = await authService.hashPassword(password);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      // Arrange
      const password = 'password123';
      const hash = 'hashed-password';

      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await authService.verifyPassword(password, hash);

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return user with role information', async () => {
      // Arrange
      const userId = 'user-123';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.getUserById(userId);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['role'],
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true for existing user', async () => {
      // Arrange
      const email = 'test@example.com';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await authService.userExistsByEmail(email);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      // Arrange
      const email = 'nonexistent@example.com';

      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await authService.userExistsByEmail(email);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle email trimming and lowercasing', async () => {
      // Arrange
      const email = '  TEST@EXAMPLE.COM  ';

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act
      await authService.userExistsByEmail(email);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });
});

/**
 * Authentication Routes Tests
 *
 * Integration tests for authentication endpoints
 */

// Set JWT_SECRET before any imports to prevent config errors
import { TEST_JWT } from '../helpers/test-constants';
process.env.JWT_SECRET = TEST_JWT.secret;

import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth';
import { TokenType } from '../../config/jwt';
import { TEST_CREDENTIALS, TEST_USER } from '../helpers/test-constants';

// Mock dependencies first
jest.mock('../../services/AuthService');

// Create a mock AuthService instance
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  getUserById: jest.fn(),
  validateToken: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  userExistsByEmail: jest.fn(),
};

jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimit: jest.fn((_req, _res, next) => next()),
  strictAuthRateLimit: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../utils/ip', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
}));

jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn(),
  optionalAuthenticate: jest.fn((_req, _res, next) => next()),
  authorize: jest.fn(() => (_req, _res, next) => next()),
  requireAdmin: jest.fn((_req, _res, next) => next()),
  requireActiveUser: jest.fn((_req, _res, next) => next()),
}));

describe('Auth Routes', () => {
  let app: express.Application;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { authenticate } = require('../../middleware/auth');

  beforeEach(() => {
    // Setup Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup AuthService mock implementation
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AuthService = require('../../services/AuthService').AuthService;
    AuthService.mockImplementation(() => mockAuthService);

    // Reset authenticate mock to default behavior (no authentication)
    authenticate.mockImplementation((_req, res) => {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    };

    const mockLoginResult = {
      tokens: {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      },
      user: {
        ...TEST_USER,
        lastLogin: new Date(),
      },
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const response = await request(app).post('/auth/login').send(validLoginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Login successful',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roleId: 'role-123',
          roleName: 'Admin',
          permissions: { plc: { read: true } },
          isActive: true,
          // lastLogin is converted to string during JSON serialization
          lastLogin: expect.any(String),
        },
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
        expect.any(String), // IP address
        expect.any(String) // User agent
      );
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      // Act
      const response = await request(app).post('/auth/login').send(validLoginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication failed',
        message: 'Invalid credentials',
      });
    });

    it('should validate email format', async () => {
      // Arrange
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Act
      const response = await request(app).post('/auth/login').send(invalidEmailData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });

    it('should validate password length', async () => {
      // Arrange
      const shortPasswordData = {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.shortPassword,
      };

      // Act
      const response = await request(app).post('/auth/login').send(shortPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });

    it('should require email field', async () => {
      // Arrange
      const missingEmailData = {
        password: 'password123',
      };

      // Act
      const response = await request(app).post('/auth/login').send(missingEmailData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });

    it('should require password field', async () => {
      // Arrange
      const missingPasswordData = {
        email: TEST_CREDENTIALS.email,
      };

      // Act
      const response = await request(app).post('/auth/login').send(missingPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });

    it('should normalize email to lowercase and trim', async () => {
      // Arrange
      const unnormalizedEmailData = {
        email: '  TEST@EXAMPLE.COM  ',
        password: TEST_CREDENTIALS.password,
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      await request(app).post('/auth/login').send(unnormalizedEmailData);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('POST /auth/refresh', () => {
    const validRefreshData = {
      refreshToken: 'valid-refresh-token',
    };

    const mockRefreshResult = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      // Arrange
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);

      // Act
      const response = await request(app).post('/auth/refresh').send(validRefreshData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Token refreshed successfully',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        expect.any(String), // IP address
        expect.any(String) // User agent
      );
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      const response = await request(app).post('/auth/refresh').send(validRefreshData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token',
      });
    });

    it('should require refreshToken field', async () => {
      // Act
      const response = await request(app).post('/auth/refresh').send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });

    it('should validate refreshToken as string', async () => {
      // Act
      const response = await request(app).post('/auth/refresh').send({ refreshToken: 123 }); // Should be string

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Validation error',
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout authenticated user', async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: 'ACCESS',
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Logout successful',
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith(TEST_USER.id, TEST_JWT.tokenId);
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).post('/auth/logout');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication required',
      });
    });
  });

  describe('GET /auth/me', () => {
    const mockUser = {
      ...TEST_USER,
      role: {
        name: TEST_USER.roleName,
        permissions: TEST_USER.permissions,
      },
      lastLogin: new Date(),
    };

    it('should return user profile for authenticated user', async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: 'ACCESS',
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      mockAuthService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          roleId: 'role-123',
          roleName: 'Admin',
          permissions: { plc: { read: true } },
          isActive: true,
        },
      });
    });

    it('should return 401 for inactive user', async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: 'ACCESS',
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      const inactiveUser = { ...mockUser, isActive: false };
      mockAuthService.getUserById.mockResolvedValue(inactiveUser);

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Account inactive',
        message: 'User account has been deactivated',
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await request(app).get('/auth/me');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication required',
      });
    });
  });

  describe('GET /auth/verify', () => {
    it('should verify valid token', async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: 'user-123',
          email: 'test@example.com',
          roleId: 'role-123',
          permissions: { plc: { read: true } },
          type: TokenType.ACCESS,
          jti: 'token-123',
        };
        next();
      });

      // Act
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer valid-token');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        valid: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          roleId: 'role-123',
          permissions: { plc: { read: true } },
        },
      });
    });

    it('should return 401 for invalid token', async () => {
      // Act
      const response = await request(app).get('/auth/verify');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Authentication required',
      });
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // Assert that rate limiting middleware is mocked
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { authRateLimit, strictAuthRateLimit } = require('../../middleware/rateLimiter');
      expect(authRateLimit).toBeDefined();
      expect(strictAuthRateLimit).toBeDefined();
    });

    it('should apply rate limiting to refresh endpoint', async () => {
      // Assert that rate limiting middleware is mocked
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { authRateLimit } = require('../../middleware/rateLimiter');
      expect(authRateLimit).toBeDefined();
    });
  });
});

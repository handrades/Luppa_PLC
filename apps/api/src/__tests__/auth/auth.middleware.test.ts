/**
 * Authentication Middleware Tests
 *
 * Unit tests for authentication and authorization middleware
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextFunction, Request, Response } from 'express';
import {
  authenticate,
  authorize,
  optionalAuthenticate,
  requireActiveUser,
  requireAdmin,
} from '../../middleware/auth';
import { AuthService } from '../../services/AuthService';
import { TokenType } from '../../config/jwt';

// Mock dependencies
jest.mock('../../services/AuthService');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Setup mock request
    mockRequest = {
      headers: {},
      user: undefined,
      auditEntityManager: {
        getRepository: jest.fn(),
        query: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn(),
      } as any,
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock next function
    mockNext = jest.fn();

    // Setup AuthService mock
    mockAuthService = new AuthService(mockRequest.auditEntityManager!) as jest.Mocked<AuthService>;
    (AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(() => mockAuthService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid Bearer token', async () => {
      // Arrange
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        roleId: 'role-123',
        permissions: { plc: { read: true } },
        type: TokenType.ACCESS,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockAuthService.validateToken.mockResolvedValue(mockUser);

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should return 401 for missing Authorization header', async () => {
      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Authorization header format', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Invalid header format',
      };

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for empty Bearer token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Missing access token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockAuthService.validateToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockAuthService.validateToken.mockRejectedValue(new Error('Token expired'));

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Token expired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for blacklisted token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer blacklisted-token',
      };

      mockAuthService.validateToken.mockRejectedValue(new Error('Token has been revoked'));

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Token has been revoked',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for session not found', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer session-less-token',
      };

      mockAuthService.validateToken.mockRejectedValue(new Error('Session not found'));

      // Act
      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Session not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate middleware', () => {
    it('should authenticate valid token when present', async () => {
      // Arrange
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        roleId: 'role-123',
        permissions: { plc: { read: true } },
        type: TokenType.ACCESS,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token-123',
      };

      mockAuthService.validateToken.mockResolvedValue(mockUser);

      // Act
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      // Act
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateToken).not.toHaveBeenCalled();
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockAuthService.validateToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('invalid-token');
      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should authorize user with required permission', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          plc: { read: true, write: false },
        },
      } as any;

      const authorizeMiddleware = authorize('plc.read');

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny user without required permission', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          plc: { read: true, write: false },
        },
      } as any;

      const authorizeMiddleware = authorize('plc.write');

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authorize user with any of multiple required permissions', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          plc: { read: true, write: false },
          users: { read: false, write: false },
        },
      } as any;

      const authorizeMiddleware = authorize(['plc.write', 'plc.read']);

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny unauthenticated user', () => {
      // Arrange
      mockRequest.user = undefined;

      const authorizeMiddleware = authorize('plc.read');

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle nested permission paths', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          plc: {
            inventory: { read: true, write: false },
          },
        },
      } as any;

      const authorizeMiddleware = authorize('plc.inventory.read');

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-existent permission path', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          plc: { read: true },
        },
      } as any;

      const authorizeMiddleware = authorize('nonexistent.permission');

      // Act
      authorizeMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    it('should allow access for admin users', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          admin: true,
        },
      } as any;

      // Act
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin users', () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        permissions: {
          admin: false,
        },
      } as any;

      // Act
      requireAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access forbidden',
        message: 'Insufficient permissions',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireActiveUser middleware', () => {
    it('should allow access for active users', async () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        email: 'test@example.com',
      } as any;

      const mockUser = {
        id: 'user-123',
        isActive: true,
      };

      mockAuthService.getUserById.mockResolvedValue(mockUser as any);

      // Act
      await requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-123');
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for inactive users', async () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        email: 'test@example.com',
      } as any;

      const mockUser = {
        id: 'user-123',
        isActive: false,
      };

      mockAuthService.getUserById.mockResolvedValue(mockUser as any);

      // Act
      await requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Account inactive',
        message: 'User account has been deactivated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for non-existent users', async () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        email: 'test@example.com',
      } as any;

      mockAuthService.getUserById.mockResolvedValue(null);

      // Act
      await requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Account inactive',
        message: 'User account has been deactivated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated users', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'User not authenticated',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockRequest.user = {
        sub: 'user-123',
        email: 'test@example.com',
      } as any;

      mockAuthService.getUserById.mockRejectedValue(new Error('Database error'));

      // Act
      await requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Failed to verify user status',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

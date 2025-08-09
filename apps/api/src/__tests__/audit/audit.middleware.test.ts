/**
 * Audit Middleware Tests
 *
 * Tests for audit context middleware performance and functionality
 */

import { NextFunction, Request, Response } from 'express';
import { auditContextMiddleware } from '../../middleware/auditContext';
import { AppDataSource } from '../../config/database';
import { QueryRunner } from 'typeorm';
import { logger } from '../../config/logger';

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    manager: {},
    createQueryRunner: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Audit Context Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response & { _finishCallback?: () => Promise<void> }>;
  let mockNext: NextFunction;
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'test-user-id',
        sub: 'test-user-id',
        email: 'test@example.com',
        sessionId: 'test-session-id',
        roleId: 'admin-role-id',
        permissions: { audit: { read: true } },
        iat: Date.now(),
        exp: Date.now() + 86400,
      },
      connection: {
        remoteAddress: '192.168.1.100',
      } as unknown,
      socket: {
        remoteAddress: '192.168.1.100',
      } as unknown,
      headers: {
        'user-agent': 'Test User Agent',
        'x-forwarded-for': '10.0.0.1, 192.168.1.100',
      },
      get: jest.fn((header: string) => {
        const headers = {
          'user-agent': 'Test User Agent',
          'x-forwarded-for': '10.0.0.1, 192.168.1.100',
        };
        return headers[header.toLowerCase() as keyof typeof headers];
      }),
    };

    mockResponse = {
      on: jest.fn(),
    };

    mockNext = jest.fn();

    mockQueryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };

    // Reset AppDataSource mock
    (AppDataSource as { manager?: unknown }).manager = {};
    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

    // Don't automatically trigger finish callback
    (mockResponse.on as jest.Mock).mockImplementation((event, callback) => {
      // Store the callback but don't auto-trigger
      if (event === 'finish') {
        mockResponse._finishCallback = callback;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Context Setting', () => {
    it('should set PostgreSQL session variables for authenticated user', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.current_user_id = $1', [
        'test-user-id',
      ]);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.client_ip = $1', ['10.0.0.1']);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.user_agent = $1', [
        'Test User Agent',
      ]);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.session_id = $1', [
        'test-session-id',
      ]);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle missing user context gracefully', async () => {
      mockRequest.user = undefined;

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not set user ID when not authenticated
      expect(mockQueryRunner.query).not.toHaveBeenCalledWith(
        expect.stringContaining('app.current_user_id')
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract IP address from X-Forwarded-For header', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should use first IP from X-Forwarded-For
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.client_ip = $1', ['10.0.0.1']);
    });

    it('should extract IP from X-Real-IP when X-Forwarded-For is not present', async () => {
      mockRequest.get = jest.fn((header: string) => {
        const headers = {
          'x-real-ip': '172.16.0.1',
          'user-agent': 'Test User Agent',
        };
        return headers[header.toLowerCase() as keyof typeof headers];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.client_ip = $1', ['172.16.0.1']);
    });

    it('should escape single quotes in user agent', async () => {
      mockRequest.get = jest.fn((header: string) => {
        if (header.toLowerCase() === 'user-agent') {
          return "Mozilla/5.0 (compatible; Bot/1.0; 'test')";
        }
        return mockRequest.headers?.[header.toLowerCase()];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.user_agent = $1', [
        "Mozilla/5.0 (compatible; Bot/1.0; 'test')",
      ]);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete within 10ms performance threshold', async () => {
      const startTime = Date.now();

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });

    it('should log warning if execution exceeds 10ms threshold', async () => {
      // Mock slow query execution
      mockQueryRunner.query = jest
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 15)));

      // Call the middleware
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Manually trigger the finish callback after a delay
      await new Promise<void>(resolve => {
        setTimeout(async () => {
          if (mockResponse._finishCallback) {
            await mockResponse._finishCallback();
          }
          resolve();
        }, 20);
      });

      // Check that warning was logged
      expect(logger.warn).toHaveBeenCalledWith(
        'Audit middleware exceeded 10ms threshold',
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue request processing when database is unavailable', async () => {
      (AppDataSource.createQueryRunner as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle query runner errors gracefully', async () => {
      mockQueryRunner.query = jest.fn().mockRejectedValue(new Error('SQL execution failed'));

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      // Query runner should be released on error in the catch block
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should clean up query runner on response finish', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Manually trigger the finish callback
      if (mockResponse._finishCallback) {
        await mockResponse._finishCallback();
      }

      // Check cleanup was performed
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('Session ID Extraction', () => {
    it('should extract session ID from JWT token', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.session_id = $1', [
        'test-session-id',
      ]);
    });

    it('should extract session ID from X-Session-ID header', async () => {
      mockRequest.user = { ...mockRequest.user, sessionId: undefined } as typeof mockRequest.user;
      mockRequest.get = jest.fn((header: string) => {
        const headers = {
          'user-agent': 'Test User Agent',
          'x-forwarded-for': '10.0.0.1, 192.168.1.100',
          'x-session-id': 'header-session-id',
        };
        return headers[header.toLowerCase() as keyof typeof headers];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SET app.session_id = $1', [
        'header-session-id',
      ]);
    });

    it('should handle missing session ID gracefully', async () => {
      mockRequest.user = { ...mockRequest.user, sessionId: undefined } as typeof mockRequest.user;

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not set session ID when not available
      expect(mockQueryRunner.query).not.toHaveBeenCalledWith(
        expect.stringContaining('app.session_id')
      );
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Integration with AppDataSource', () => {
    it('should handle missing AppDataSource manager gracefully', async () => {
      (AppDataSource as { manager?: unknown }).manager = undefined;

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should store query runner on request for cleanup', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.auditQueryRunner).toBe(mockQueryRunner);
    });
  });
});

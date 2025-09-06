/**
 * Audit Middleware Tests
 *
 * Tests for audit context middleware performance and functionality
 */

import { NextFunction, Request, Response } from 'express';
import { auditContextMiddleware } from '../../middleware/auditContext';
import { getAppDataSource } from '../../config/database';
import { QueryRunner } from 'typeorm';
import { logger } from '../../config/logger';

// Request properties are now defined globally in types/express.d.ts
type RequestWithAudit = Request;

// Database and logger are already mocked in jest.setup.js

describe('Audit Context Middleware', () => {
  let mockRequest: Partial<RequestWithAudit>;
  let mockResponse: Partial<Response & { _finishCallback?: () => Promise<void> }>;
  let mockNext: NextFunction;
  let mockQueryRunner: Partial<QueryRunner>;

  beforeEach(() => {
    mockRequest = {
      ip: '10.0.0.1', // Express's built-in IP extraction
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
      once: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock driver escape method
    const mockDriver = {
      escape: jest.fn().mockImplementation((value: unknown) => {
        if (value === null || value === undefined) return "'null'";
        if (typeof value === 'string') {
          // Escape single quotes by doubling them (PostgreSQL style)
          const escaped = value.replace(/'/g, "''");
          return `'${escaped}'`;
        }
        return `'${String(value)}'`;
      }),
    };

    mockQueryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      manager: {
        connection: {
          driver: mockDriver,
        },
      } as unknown,
    };

    // Reset getAppDataSource mock
    (getAppDataSource as jest.Mock).mockReturnValue({
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      isInitialized: true,
    });

    // Store callbacks for both on and once events
    (mockResponse.on as jest.Mock).mockImplementation((event, callback) => {
      // Store the callback but don't auto-trigger
      if (event === 'finish') {
        mockResponse._finishCallback = callback;
      }
      return mockResponse; // Return for chaining
    });

    (mockResponse.once as jest.Mock).mockImplementation((event, callback) => {
      // Store the callback but don't auto-trigger
      if (event === 'finish') {
        mockResponse._finishCallback = callback;
      }
      return mockResponse; // Return for chaining
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Context Setting', () => {
    it('should set PostgreSQL session variables for authenticated user', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        "SET app.current_user_id = 'test-user-id'"
      );
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.client_ip = '10.0.0.1'");
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.user_agent = 'Test User Agent'");
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.session_id = 'test-session-id'");
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle missing user context gracefully', async () => {
      mockRequest.user = undefined;

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should set user ID to null when not authenticated to avoid stale context
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.current_user_id = 'null'");
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract IP address from X-Forwarded-For header', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should use IP from Express's built-in req.ip (which handles X-Forwarded-For)
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.client_ip = '10.0.0.1'");
    });

    it('should extract IP from X-Real-IP when X-Forwarded-For is not present', async () => {
      // Simulate Express's built-in IP extraction from X-Real-IP
      mockRequest.ip = '172.16.0.1';
      mockRequest.get = jest.fn((header: string) => {
        const headers = {
          'x-real-ip': '172.16.0.1',
          'user-agent': 'Test User Agent',
        };
        return headers[header.toLowerCase() as keyof typeof headers];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.client_ip = '172.16.0.1'");
    });

    it('should escape single quotes in user agent', async () => {
      mockRequest.get = jest.fn((header: string) => {
        if (header.toLowerCase() === 'user-agent') {
          return "Mozilla/5.0 (compatible; Bot/1.0; 'test')";
        }
        return mockRequest.headers?.[header.toLowerCase()];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        "SET app.user_agent = 'Mozilla/5.0 (compatible; Bot/1.0; ''test'')'"
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should not log performance warning for normal execution', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify the finish callback was registered
      expect(mockResponse.once).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockResponse.once).toHaveBeenCalledWith('close', expect.any(Function));

      // Call the finish callback that was stored
      if (mockResponse._finishCallback) {
        await mockResponse._finishCallback();
      }

      // Verify no performance warning was logged (normal execution time < 10ms)
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Audit middleware exceeded 10ms threshold',
        expect.any(Object)
      );
    });

    it('should log warning if execution exceeds 10ms threshold', async () => {
      // Use Jest fake timers for deterministic timing
      jest.useFakeTimers();

      // Mock Date.now to control the timing measurement
      const mockStartTime = 1000;
      const mockEndTime = mockStartTime + 15; // 15ms duration

      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(mockStartTime) // Initial call in middleware
        .mockReturnValueOnce(mockEndTime); // Call in cleanup function

      // Mock slow query execution (the actual delay doesn't matter with fake timers)
      mockQueryRunner.query = jest.fn().mockResolvedValue(undefined);

      // Call the middleware
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Ensure the finish callback is properly captured and call it
      expect(mockResponse.once).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockResponse.once).toHaveBeenCalledWith('close', expect.any(Function));

      // Get the finish callback that was registered
      const finishCallback = (mockResponse.once as jest.Mock).mock.calls.find(
        call => call[0] === 'finish'
      )[1];

      // Call the finish callback manually to trigger the performance check
      await finishCallback();

      // Check that warning was logged with proper duration
      expect(logger.warn).toHaveBeenCalledWith(
        'Audit middleware exceeded 10ms threshold',
        expect.objectContaining({
          duration: 15,
          path: undefined,
          method: undefined,
        })
      );

      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should continue request processing when database is unavailable', async () => {
      (getAppDataSource as jest.Mock).mockImplementation(() => {
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

      // Ensure the finish callback is properly captured
      expect(mockResponse.once).toHaveBeenCalledWith('finish', expect.any(Function));

      // Call the finish callback that was stored
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

      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.session_id = 'test-session-id'");
    });

    it('should extract session ID from X-Session-ID header', async () => {
      mockRequest.user = {
        ...mockRequest.user,
        sessionId: undefined,
      } as typeof mockRequest.user;
      mockRequest.get = jest.fn((header: string) => {
        const headers = {
          'user-agent': 'Test User Agent',
          'x-forwarded-for': '10.0.0.1, 192.168.1.100',
          'x-session-id': 'header-session-id',
        };
        return headers[header.toLowerCase() as keyof typeof headers];
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        "SET app.session_id = 'header-session-id'"
      );
    });

    it('should handle missing session ID gracefully', async () => {
      mockRequest.user = {
        ...mockRequest.user,
        sessionId: undefined,
      } as typeof mockRequest.user;

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Should set session ID to null when not available to avoid stale context
      expect(mockQueryRunner.query).toHaveBeenCalledWith("SET app.session_id = 'null'");
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Integration with AppDataSource', () => {
    it('should handle uninitialized AppDataSource gracefully', async () => {
      (getAppDataSource as jest.Mock).mockReturnValue({
        isInitialized: false,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      });

      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should store query runner on request for cleanup', async () => {
      await auditContextMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.auditQueryRunner).toBe(mockQueryRunner);
    });
  });
});

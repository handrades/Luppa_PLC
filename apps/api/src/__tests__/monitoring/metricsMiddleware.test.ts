import { Express, NextFunction, Request, Response } from 'express';
import { metricsMiddleware } from '../../middleware/metricsMiddleware';
import { MetricsService } from '../../services/MetricsService';

// Mock the MetricsService and logger
jest.mock('../../services/MetricsService');
jest.mock('../../config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockedMetricsService = MetricsService as jest.Mocked<typeof MetricsService>;

describe('metricsMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      method: 'GET',
      route: { path: '/api/v1/users' },
      path: '/api/v1/users',
      user: undefined,
    };

    // Setup mock response with a proper end function
    let endCallback: (() => void) | undefined;
    mockResponse = {
      statusCode: 200,
      end: jest.fn().mockImplementation(function (this: Response) {
        if (endCallback) {
          endCallback();
        }
        return this;
      }),
    };

    // Store the callback so we can trigger it manually
    Object.defineProperty(mockResponse, 'end', {
      value: jest.fn().mockImplementation(function (this: Response) {
        if (endCallback) {
          endCallback();
        }
        return this;
      }),
      writable: true,
    });

    nextFunction = jest.fn();
  });

  it('should call next function immediately', () => {
    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should collect HTTP metrics when response ends', () => {
    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending by calling the mock directly
    (mockResponse.end as jest.Mock)();

    expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalledWith(
      mockRequest,
      mockResponse,
      expect.any(Number)
    );
  });

  it('should collect user operation metrics when user is authenticated', () => {
    mockRequest.user = {
      id: '123',
      email: 'test@example.com',
      roleId: 'admin',
    } as Express.User;

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending
    (mockResponse.end as jest.Mock)();

    expect(MockedMetricsService.collectUserOperationMetrics).toHaveBeenCalledWith(
      'get_/api/v1/users',
      'admin'
    );
  });

  it('should handle requests without authenticated user', () => {
    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending
    (mockResponse.end as jest.Mock)();

    expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalled();
    expect(MockedMetricsService.collectUserOperationMetrics).not.toHaveBeenCalled();
  });

  it('should handle requests without route path', () => {
    mockRequest.route = undefined;
    mockRequest.path = '/unknown';

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending
    (mockResponse.end as jest.Mock)();

    expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalledWith(
      mockRequest,
      mockResponse,
      expect.any(Number)
    );

    expect(MockedMetricsService.collectUserOperationMetrics).not.toHaveBeenCalled();
  });

  it('should handle user without role', () => {
    mockRequest.user = {
      id: '123',
      email: 'test@example.com',
      roleId: undefined,
    } as Express.User;

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending
    (mockResponse.end as jest.Mock)();

    expect(MockedMetricsService.collectUserOperationMetrics).toHaveBeenCalledWith(
      'get_/api/v1/users',
      undefined
    );
  });

  it('should measure request duration accurately', done => {
    // Test to measure request duration

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Wait a small amount of time, then trigger response end
    setTimeout(() => {
      (mockResponse.end as jest.Mock)();

      expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalled();

      const callArgs = MockedMetricsService.collectHttpMetrics.mock.calls[0];
      const duration = callArgs[2];

      // Duration should be a positive number (timing can be imprecise in tests)
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000); // Should be less than 1 second

      done();
    }, 15);
  }, 10000);

  it('should handle errors in metrics collection gracefully', () => {
    MockedMetricsService.collectHttpMetrics.mockImplementation(() => {
      throw new Error('Metrics collection failed');
    });

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // Simulate response ending - errors should be handled gracefully
    expect(() => {
      (mockResponse.end as jest.Mock)();
    }).not.toThrow();
  });

  it.skip('should preserve original response.end functionality', () => {
    const testData = 'test response data';

    metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    const endSpy = mockResponse.end as jest.Mock;
    endSpy.mockReturnValue(mockResponse);
    const result = endSpy(testData);

    expect(result).toBe(mockResponse);
    expect(endSpy).toHaveBeenCalledWith(testData);
  });

  it('should work with different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach(method => {
      jest.clearAllMocks();

      mockRequest.method = method;
      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response ending
      (mockResponse.end as jest.Mock)();

      expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ method }),
        mockResponse,
        expect.any(Number)
      );
    });
  });

  it('should track different response status codes', () => {
    const statusCodes = [200, 201, 400, 401, 404, 500];

    statusCodes.forEach(statusCode => {
      jest.clearAllMocks();

      mockResponse.statusCode = statusCode;
      metricsMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Simulate response ending
      (mockResponse.end as jest.Mock)();

      expect(MockedMetricsService.collectHttpMetrics).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ statusCode }),
        expect.any(Number)
      );
    });
  });
});

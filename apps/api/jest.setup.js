// CRITICAL: Set NODE_ENV first to ensure test database configuration is used
process.env.NODE_ENV = 'test';

// CRITICAL: Set JWT secrets FIRST before any modules load to prevent validation failures
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    'test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET =
    'test-jwt-refresh-secret-that-is-at-least-32-characters-long-for-testing-purposes';
}
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Jest setup file for API tests
require('reflect-metadata');
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Mock logger to avoid file writes during testing
jest.mock('./src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  httpLogStream: {
    write: jest.fn(),
  },
}));

// Mock database to prevent actual database connections
jest.mock('./src/config/database', () => {
  const mockQueryRunner = {
    query: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    manager: {
      connection: {
        driver: {
          escape: jest.fn().mockImplementation(value => {
            if (value === null || value === undefined) return "'null'";
            if (typeof value === 'string') {
              const escaped = value.replace(/'/g, "''");
              return `'${escaped}'`;
            }
            return `'${String(value)}'`;
          }),
        },
      },
    },
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
    query: jest.fn(),
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    manager: {},
    isInitialized: true,
  };

  return {
    AppDataSource: mockDataSource,
    getAppDataSource: jest.fn(() => mockDataSource),
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
    closeDatabase: jest.fn().mockResolvedValue(undefined),
    isDatabaseHealthy: jest.fn().mockResolvedValue(true),
    getConnectionPoolStats: jest.fn().mockResolvedValue({
      isConnected: true,
      totalConnections: 1,
      idleConnections: 1,
      runningConnections: 0,
      poolConfig: {
        min: 2,
        max: 10,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 600000,
      },
    }),
    getDatabaseHealth: jest.fn().mockResolvedValue({
      isHealthy: true,
      responseTime: 10,
      poolStats: {
        isConnected: true,
        totalConnections: 1,
        idleConnections: 1,
        runningConnections: 0,
        poolConfig: {
          min: 2,
          max: 10,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 600000,
        },
      },
    }),
  };
});

// Note: Individual test files can override these mocks as needed

// Increase timeout for integration tests
jest.setTimeout(10000);

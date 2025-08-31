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
            if (value === null || value === undefined) return 'NULL';
            if (typeof value === 'number') return String(value);
            if (typeof value === 'boolean') return String(value);
            if (typeof value === 'string') {
              const escaped = value.replace(/'/g, "''");
              return `'${escaped}'`;
            }
            // For other primitive types, return unquoted literal
            return String(value);
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
    findOne: jest.fn(),
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
    manager: {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    },
    isInitialized: true,
    destroy: jest.fn().mockResolvedValue(undefined),
  };

  return {
    AppDataSource: mockDataSource,
    getAppDataSource: jest.fn(() => mockDataSource),
    getDatabaseConfig: jest.fn(() => {
      // Parse environment variables with same logic as real implementation
      const port = parseInt(process.env.DB_PORT || '5432', 10);
      const poolConfig = {
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000', 10),
      };

      // Validate port number
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(
          `Invalid DB_PORT value: ${process.env.DB_PORT}. Must be a number between 1 and 65535.`
        );
      }

      // Validate pool settings
      if (
        isNaN(poolConfig.min) ||
        isNaN(poolConfig.max) ||
        poolConfig.min < 1 ||
        poolConfig.max < poolConfig.min
      ) {
        throw new Error(
          `Invalid pool settings: min=${poolConfig.min}, max=${poolConfig.max}. Min must be >= 1 and max must be >= min.`
        );
      }

      // Validate timeout settings
      if (
        isNaN(poolConfig.connectionTimeoutMillis) ||
        isNaN(poolConfig.idleTimeoutMillis) ||
        poolConfig.connectionTimeoutMillis < 1000 ||
        poolConfig.idleTimeoutMillis < 1000
      ) {
        throw new Error('Connection and idle timeouts must be at least 1000ms');
      }

      return {
        host: process.env.DB_HOST || 'localhost',
        port: port,
        database: process.env.DB_DATABASE || process.env.DB_NAME || 'test_db',
        username: process.env.DB_USERNAME || process.env.DB_USER || 'test_user',
        password: process.env.DB_PASSWORD || 'test_password',
        ssl:
          process.env.DB_SSL_MODE === 'require'
            ? {
                rejectUnauthorized: process.env.NODE_ENV === 'production',
                ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA : undefined,
                cert: process.env.DB_SSL_CERT ? process.env.DB_SSL_CERT : undefined,
                key: process.env.DB_SSL_KEY ? process.env.DB_SSL_KEY : undefined,
              }
            : false,
        pool: poolConfig,
      };
    }),
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

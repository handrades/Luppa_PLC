/**
 * TypeORM Database Configuration
 *
 * This file configures the TypeORM DataSource with environment-based settings,
 * connection pooling, and proper SSL/authentication configuration.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './env';
import { raceWithTimeout } from '../utils/timeout';
import { AuditLog } from '../entities/AuditLog';
import { Cell } from '../entities/Cell';
import { Equipment } from '../entities/Equipment';
import { Notification } from '../entities/Notification';
import { PLC } from '../entities/PLC';
import { Role } from '../entities/Role';
import { Site } from '../entities/Site';
import { Tag } from '../entities/Tag';
import { User } from '../entities/User';

/**
 * Database environment variables with validation and defaults
 */
const createDatabaseConfig = () => {
  // Database connection settings
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'luppa_plc',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl:
      process.env.DB_SSL_MODE === 'require'
        ? {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
            ca: process.env.DB_SSL_CA ? process.env.DB_SSL_CA : undefined,
            cert: process.env.DB_SSL_CERT ? process.env.DB_SSL_CERT : undefined,
            key: process.env.DB_SSL_KEY ? process.env.DB_SSL_KEY : undefined,
          }
        : false,
  };

  // Connection pool settings
  const poolConfig = {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '600000', 10), // 10 minutes
  };

  // Validate port number
  if (isNaN(dbConfig.port) || dbConfig.port < 1 || dbConfig.port > 65535) {
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
    ...dbConfig,
    pool: poolConfig,
  };
};

/**
 * Create TypeORM DataSource configuration
 */
const createDataSource = () => {
  const dbConfig = createDatabaseConfig();

  return new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,

    // Connection pooling configuration
    extra: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
      idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
    },

    // Entity and migration locations
    entities: [User, Role, Site, Cell, Equipment, PLC, Tag, AuditLog, Notification],
    migrations: [
      process.env.NODE_ENV === 'production'
        ? 'dist/database/migrations/**/*.js'
        : 'src/database/migrations/**/*.ts',
    ],
    subscribers: [
      process.env.NODE_ENV === 'production'
        ? 'dist/database/subscribers/**/*.js'
        : 'src/database/subscribers/**/*.ts',
    ],

    // Development settings
    synchronize: false, // Always use migrations for schema changes
    logging: config.env === 'development' ? ['query', 'error', 'warn'] : ['error'],
    logger: 'advanced-console',

    // Migration settings
    migrationsRun: false, // Don't auto-run migrations on startup
    migrationsTableName: 'migration_history',
  });
};

/**
 * DataSource instance for the application
 */
export const AppDataSource = createDataSource();

/**
 * Initialize database connection
 *
 * @returns Promise that resolves when connection is established
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      // eslint-disable-next-line no-console
      console.log('Database connection initialized successfully');

      // Log connection pool info in development
      if (config.env === 'development') {
        const dbConfig = createDatabaseConfig();
        // eslint-disable-next-line no-console
        console.log(`Database pool configured: min=${dbConfig.pool.min}, max=${dbConfig.pool.max}`);
        // eslint-disable-next-line no-console
        console.log(
          `Connection timeout: ${dbConfig.pool.connectionTimeoutMillis}ms, idle timeout: ${dbConfig.pool.idleTimeoutMillis}ms`
        );
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during database initialization:', error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 *
 * @returns Promise that resolves when connection is closed
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      // eslint-disable-next-line no-console
      console.log('Database connection closed successfully');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during database shutdown:', error);
    throw error;
  }
};

/**
 * Get database connection health status
 *
 * @returns Promise that resolves to boolean indicating if database is connected
 */
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    if (!AppDataSource.isInitialized) {
      return false;
    }

    // Execute a simple query to test connection
    await AppDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Get detailed connection pool status and metrics
 *
 * @returns Connection pool statistics and health information
 */
export const getConnectionPoolStats = async (): Promise<{
  isConnected: boolean;
  totalConnections?: number;
  idleConnections?: number;
  runningConnections?: number;
  poolConfig: {
    min: number;
    max: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
}> => {
  const dbConfig = createDatabaseConfig();

  try {
    if (!AppDataSource.isInitialized) {
      return {
        isConnected: false,
        poolConfig: dbConfig.pool,
      };
    }

    // Get connection pool statistics from the driver
    // Note: Pool stats may not be available in all environments (like tests)
    const driver = AppDataSource.driver as unknown as {
      master?: {
        _pool?: {
          totalCount?: number;
          idleCount?: number;
          waitingCount?: number;
        };
      };
      pool?: {
        totalCount?: number;
        idleCount?: number;
        waitingCount?: number;
      };
    };
    const pool = driver.master?._pool || driver.pool;

    return {
      isConnected: true,
      totalConnections: pool?.totalCount || 0,
      idleConnections: pool?.idleCount || 0,
      runningConnections: pool?.waitingCount || 0,
      poolConfig: dbConfig.pool,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting connection pool stats:', error);
    return {
      isConnected: false,
      poolConfig: dbConfig.pool,
    };
  }
};

/**
 * Enhanced database health check with connection pool validation
 * Includes 100ms timeout to guarantee fast health checks
 *
 * @returns Detailed health information including pool status
 */
export const getDatabaseHealth = async (): Promise<{
  isHealthy: boolean;
  responseTime: number;
  poolStats: Awaited<ReturnType<typeof getConnectionPoolStats>>;
  lastError?: string;
}> => {
  const startTime = Date.now();
  let lastError: string | undefined;

  try {
    // Run health check and pool stats concurrently, then race against 100ms timeout
    const healthCheckPromise = isDatabaseHealthy();
    const poolStatsPromise = getConnectionPoolStats();

    const combinedPromise = Promise.all([healthCheckPromise, poolStatsPromise]).then(
      ([isHealthy, poolStats]) => ({ isHealthy, poolStats })
    );

    const { isHealthy, poolStats } = await raceWithTimeout(combinedPromise, 100);

    const responseTime = Date.now() - startTime;

    return {
      isHealthy,
      responseTime,
      poolStats,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    lastError = error instanceof Error ? error.message : 'Unknown error';

    // Try to get pool stats even on failure, but with a shorter timeout
    let poolStats;
    try {
      poolStats = await raceWithTimeout(getConnectionPoolStats(), 50);
    } catch (poolError) {
      // Provide fallback pool stats if we can't get real ones
      poolStats = {
        isConnected: false,
        poolConfig: {
          min: 0,
          max: 0,
          connectionTimeoutMillis: 0,
          idleTimeoutMillis: 0,
        },
      };
    }

    return {
      isHealthy: false,
      responseTime,
      poolStats,
      lastError,
    };
  }
};

/**
 * Export database configuration for testing and debugging
 */
export const getDatabaseConfig = () => createDatabaseConfig();

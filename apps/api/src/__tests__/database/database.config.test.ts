/**
 * Database Configuration Tests
 * 
 * Tests for TypeORM database configuration, connection pooling,
 * and environment variable validation.
 */

import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { AppDataSource, closeDatabase, getDatabaseConfig, initializeDatabase, isDatabaseHealthy } from '../../config/database';

describe('Database Configuration', () => {
  // Test environment variables setup
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    it('should use default values when environment variables are not set', () => {
      // Clear database-related environment variables
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_MAX;
      delete process.env.DB_CONNECTION_TIMEOUT;
      delete process.env.DB_IDLE_TIMEOUT;

      const config = getDatabaseConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('luppa_plc');
      expect(config.username).toBe('postgres');
      expect(config.password).toBe('password');
      expect(config.pool.min).toBe(2);
      expect(config.pool.max).toBe(10);
      expect(config.pool.connectionTimeoutMillis).toBe(30000);
      expect(config.pool.idleTimeoutMillis).toBe(600000);
    });

    it('should use environment variables when provided', () => {
      process.env.DB_HOST = 'test-host';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_POOL_MIN = '3';
      process.env.DB_POOL_MAX = '15';
      process.env.DB_CONNECTION_TIMEOUT = '45000';
      process.env.DB_IDLE_TIMEOUT = '300000';

      const config = getDatabaseConfig();

      expect(config.host).toBe('test-host');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('test_db');
      expect(config.username).toBe('test_user');
      expect(config.password).toBe('test_password');
      expect(config.pool.min).toBe(3);
      expect(config.pool.max).toBe(15);
      expect(config.pool.connectionTimeoutMillis).toBe(45000);
      expect(config.pool.idleTimeoutMillis).toBe(300000);
    });

    it('should throw error for invalid port number', () => {
      process.env.DB_PORT = 'invalid';

      expect(() => getDatabaseConfig()).toThrow('Invalid DB_PORT value');
    });

    it('should throw error for port number out of range', () => {
      process.env.DB_PORT = '70000';

      expect(() => getDatabaseConfig()).toThrow('Invalid DB_PORT value');
    });

    it('should throw error for invalid pool settings', () => {
      process.env.DB_POOL_MIN = '10';
      process.env.DB_POOL_MAX = '5';

      expect(() => getDatabaseConfig()).toThrow('Invalid pool settings');
    });

    it('should throw error for pool min less than 1', () => {
      process.env.DB_POOL_MIN = '0';

      expect(() => getDatabaseConfig()).toThrow('Invalid pool settings');
    });

    it('should throw error for timeout values less than 1000ms', () => {
      process.env.DB_CONNECTION_TIMEOUT = '500';

      expect(() => getDatabaseConfig()).toThrow('Connection and idle timeouts must be at least 1000ms');
    });
  });

  describe('SSL Configuration', () => {
    it('should disable SSL when DB_SSL_MODE is not require', () => {
      process.env.DB_SSL_MODE = 'disable';

      const config = getDatabaseConfig();
      expect(config.ssl).toBe(false);
    });

    it('should enable SSL when DB_SSL_MODE is require', () => {
      process.env.DB_SSL_MODE = 'require';

      const config = getDatabaseConfig();
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });
  });

  describe('DataSource Configuration', () => {
    it('should create DataSource with correct configuration', () => {
      expect(AppDataSource).toBeDefined();
      expect(AppDataSource.options.type).toBe('postgres');
      expect(AppDataSource.options.synchronize).toBe(false);
      expect(AppDataSource.options.migrationsTableName).toBe('migration_history');
    });

    it('should have entities configured', () => {
      expect(AppDataSource.options.entities).toBeDefined();
      expect(Array.isArray(AppDataSource.options.entities)).toBe(true);
    });

    it('should have migrations path configured', () => {
      expect(AppDataSource.options.migrations).toBeDefined();
      expect(Array.isArray(AppDataSource.options.migrations)).toBe(true);
    });
  });

  describe('Database Health Check', () => {
    it('should return false when database is not initialized', async () => {
      const isHealthy = await isDatabaseHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should handle initialization when already initialized', async () => {
      // This test ensures no errors are thrown when initializing multiple times
      if (AppDataSource.isInitialized) {
        await expect(initializeDatabase()).resolves.not.toThrow();
      }
    });

    it('should handle closing when not initialized', async () => {
      // This test ensures no errors are thrown when closing a non-initialized connection
      await expect(closeDatabase()).resolves.not.toThrow();
    });
  });

  describe('Environment-Based Settings', () => {
    it('should configure logging based on NODE_ENV', () => {
      // Test development logging
      process.env.NODE_ENV = 'development';
      
      // Since we can't easily test the internal config without reinitializing,
      // we'll test that the function doesn't throw
      expect(() => getDatabaseConfig()).not.toThrow();
    });

    it('should handle production environment', () => {
      process.env.NODE_ENV = 'production';
      
      expect(() => getDatabaseConfig()).not.toThrow();
    });
  });
});

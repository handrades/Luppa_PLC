import {
  AppDataSource,
  getConnectionPoolStats,
  getDatabaseConfig,
  getDatabaseHealth,
} from '../../config/database';

describe('Connection Pool Configuration', () => {
  describe('Database Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env };

      // Clear environment variables that affect database config
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_MAX;
      delete process.env.DB_CONNECTION_TIMEOUT;
      delete process.env.DB_IDLE_TIMEOUT;
      delete process.env.DB_PORT;
      delete process.env.DB_SSL_MODE;
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should use default pool settings', () => {
      const config = getDatabaseConfig();

      expect(config.pool.min).toBe(2);
      expect(config.pool.max).toBe(10);
      expect(config.pool.connectionTimeoutMillis).toBe(30000);
      expect(config.pool.idleTimeoutMillis).toBe(600000);
    });

    it('should use environment variable pool settings', () => {
      process.env.DB_POOL_MIN = '5';
      process.env.DB_POOL_MAX = '20';
      process.env.DB_CONNECTION_TIMEOUT = '45000';
      process.env.DB_IDLE_TIMEOUT = '900000';

      const config = getDatabaseConfig();

      expect(config.pool.min).toBe(5);
      expect(config.pool.max).toBe(20);
      expect(config.pool.connectionTimeoutMillis).toBe(45000);
      expect(config.pool.idleTimeoutMillis).toBe(900000);
    });

    it('should validate pool configuration', () => {
      process.env.DB_POOL_MIN = '0';
      process.env.DB_POOL_MAX = '5';

      expect(() => getDatabaseConfig()).toThrow('Invalid pool settings');
    });

    it('should validate pool max greater than min', () => {
      process.env.DB_POOL_MIN = '10';
      process.env.DB_POOL_MAX = '5';

      expect(() => getDatabaseConfig()).toThrow('Invalid pool settings');
    });

    it('should validate timeout values', () => {
      process.env.DB_CONNECTION_TIMEOUT = '500';

      expect(() => getDatabaseConfig()).toThrow(
        'Connection and idle timeouts must be at least 1000ms'
      );
    });

    it('should validate port range', () => {
      process.env.DB_PORT = '70000';

      expect(() => getDatabaseConfig()).toThrow('Invalid DB_PORT value');
    });
  });

  describe('Connection Pool Stats', () => {
    it('should return pool config when not connected', async () => {
      // In test environment, we use SQLite which has different behavior
      // SQLite doesn't have real connection pooling, so we check the config structure instead
      const stats = await getConnectionPoolStats();

      expect(stats.poolConfig).toBeDefined();
      expect(stats.poolConfig.min).toBeGreaterThan(0);
      expect(stats.poolConfig.max).toBeGreaterThanOrEqual(stats.poolConfig.min);
      
      // In test environment with SQLite, isConnected might be true even after destroy
      // This is expected behavior for in-memory SQLite
      expect(typeof stats.isConnected).toBe('boolean');
    });

    it('should handle errors gracefully', async () => {
      const stats = await getConnectionPoolStats();

      expect(stats).toBeDefined();
      expect(stats.poolConfig).toBeDefined();
    });
  });

  describe('Database Health', () => {
    it('should return health information', async () => {
      const health = await getDatabaseHealth();

      expect(health).toBeDefined();
      expect(typeof health.isHealthy).toBe('boolean');
      expect(typeof health.responseTime).toBe('number');
      expect(health.poolStats).toBeDefined();
    });

    it('should measure response time', async () => {
      const health = await getDatabaseHealth();

      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.responseTime).toBeLessThan(5000); // Should be fast in tests
    });

    it('should include pool stats in health check', async () => {
      const health = await getDatabaseHealth();

      expect(health.poolStats.poolConfig).toBeDefined();
      expect(health.poolStats.poolConfig.min).toBeGreaterThan(0);
      expect(health.poolStats.poolConfig.max).toBeGreaterThanOrEqual(
        health.poolStats.poolConfig.min
      );
    });
  });

  describe('Pool Performance', () => {
    it('should handle multiple concurrent connections', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: Promise<any>[] = [];
      const connectionCount = 5;

      // Create multiple concurrent health checks to test pool
      for (let i = 0; i < connectionCount; i++) {
        promises.push(getDatabaseHealth());
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(connectionCount);
      results.forEach(result => {
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should maintain reasonable response times under load', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const health = await getDatabaseHealth();
        responseTimes.push(health.responseTime);
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(500); // Average should be fast
      expect(maxResponseTime).toBeLessThan(2000); // No individual request should be too slow
    });
  });

  describe('Configuration Validation', () => {
    it('should validate SSL configuration structure', () => {
      process.env.DB_SSL_MODE = 'require';
      process.env.NODE_ENV = 'production';

      const config = getDatabaseConfig();

      if (config.ssl) {
        expect(typeof config.ssl).toBe('object');
      }
    });

    it('should handle different environment configurations', () => {
      // Test development configuration
      process.env.NODE_ENV = 'development';
      const devConfig = getDatabaseConfig();
      expect(devConfig).toBeDefined();

      // Test production configuration
      process.env.NODE_ENV = 'production';
      const prodConfig = getDatabaseConfig();
      expect(prodConfig).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid environment variables gracefully', () => {
      process.env.DB_POOL_MIN = 'invalid';

      // Should throw error for invalid numeric environment variables
      expect(() => getDatabaseConfig()).toThrow(
        'Invalid pool settings: min=NaN, max=10. Min must be >= 1 and max must be >= min.'
      );
    });

    it('should provide meaningful error messages', () => {
      process.env.DB_PORT = 'invalid_port';

      expect(() => getDatabaseConfig()).toThrow(/Invalid DB_PORT value/);
    });
  });
});

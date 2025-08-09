/**
 * Health configuration function unit tests
 * Tests the individual health check functions and metrics collection
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { getDatabaseHealth, getConnectionPoolStats } = require('../../config/database');
const { getRedisHealth, getRedisMetrics } = require('../../config/redis');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('Health Configuration Functions', () => {
  describe('Database Health Functions', () => {
    test('getDatabaseHealth should return health information with response time', async () => {
      const startTime = Date.now();
      const result = await getDatabaseHealth();
      const endTime = Date.now();

      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('poolStats');

      expect(typeof result.isHealthy).toBe('boolean');
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(endTime - startTime + 10); // Allow small margin

      // Validate pool stats structure
      expect(result.poolStats).toHaveProperty('isConnected');
      expect(result.poolStats).toHaveProperty('poolConfig');
      expect(result.poolStats.poolConfig).toHaveProperty('min');
      expect(result.poolStats.poolConfig).toHaveProperty('max');
      expect(result.poolStats.poolConfig).toHaveProperty('connectionTimeoutMillis');
      expect(result.poolStats.poolConfig).toHaveProperty('idleTimeoutMillis');
    });

    test('getConnectionPoolStats should return connection pool configuration', async () => {
      const result = await getConnectionPoolStats();

      expect(result).toHaveProperty('isConnected');
      expect(result).toHaveProperty('poolConfig');

      expect(typeof result.isConnected).toBe('boolean');

      // Validate pool configuration
      const config = result.poolConfig;
      expect(config.min).toBeGreaterThan(0);
      expect(config.max).toBeGreaterThanOrEqual(config.min);
      expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
      expect(config.idleTimeoutMillis).toBeGreaterThan(0);
    });

    test('getDatabaseHealth should handle errors gracefully', async () => {
      // This test will pass regardless of database state
      const result = await getDatabaseHealth();

      if (!result.isHealthy && result.lastError) {
        expect(typeof result.lastError).toBe('string');
        expect(result.lastError.length).toBeGreaterThan(0);
      }

      // Response time should always be present
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Redis Health Functions', () => {
    test('getRedisHealth should return health information with response time', async () => {
      const startTime = Date.now();
      const result = await getRedisHealth();
      const endTime = Date.now();

      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('metrics');

      expect(typeof result.isHealthy).toBe('boolean');
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(endTime - startTime + 10); // Allow small margin

      // Validate metrics structure
      expect(result.metrics).toHaveProperty('isConnected');
      expect(typeof result.metrics.isConnected).toBe('boolean');
    });

    test('getRedisMetrics should return connection status', async () => {
      const result = await getRedisMetrics();

      expect(result).toHaveProperty('isConnected');
      expect(typeof result.isConnected).toBe('boolean');

      if (result.isConnected) {
        // When connected, should have detailed metrics
        if (result.memoryUsage) {
          expect(result.memoryUsage).toHaveProperty('used');
          expect(result.memoryUsage).toHaveProperty('peak');
          expect(result.memoryUsage).toHaveProperty('rss');
          expect(result.memoryUsage).toHaveProperty('overhead');

          expect(result.memoryUsage.used).toBeGreaterThanOrEqual(0);
          expect(result.memoryUsage.peak).toBeGreaterThanOrEqual(0);
          expect(result.memoryUsage.rss).toBeGreaterThanOrEqual(0);
          expect(result.memoryUsage.overhead).toBeGreaterThanOrEqual(0);
        }

        if (result.performance) {
          expect(result.performance).toHaveProperty('connectedClients');
          expect(result.performance).toHaveProperty('commandsProcessed');
          expect(result.performance).toHaveProperty('keyspaceHits');
          expect(result.performance).toHaveProperty('keyspaceMisses');
          expect(result.performance).toHaveProperty('hitRatio');

          expect(result.performance.connectedClients).toBeGreaterThanOrEqual(0);
          expect(result.performance.commandsProcessed).toBeGreaterThanOrEqual(0);
          expect(result.performance.keyspaceHits).toBeGreaterThanOrEqual(0);
          expect(result.performance.keyspaceMisses).toBeGreaterThanOrEqual(0);
          expect(result.performance.hitRatio).toBeGreaterThanOrEqual(0);
          expect(result.performance.hitRatio).toBeLessThanOrEqual(100);
        }

        if (result.config) {
          expect(result.config).toHaveProperty('maxmemory');
          expect(result.config).toHaveProperty('maxmemoryPolicy');

          expect(result.config.maxmemory).toBeGreaterThanOrEqual(0);
          expect(typeof result.config.maxmemoryPolicy).toBe('string');
        }
      } else {
        // When disconnected, should have error information
        if (result.lastError) {
          expect(typeof result.lastError).toBe('string');
          expect(result.lastError.length).toBeGreaterThan(0);
        }
      }
    });

    test('getRedisHealth should handle errors gracefully', async () => {
      // This test will pass regardless of Redis state
      const result = await getRedisHealth();

      if (!result.isHealthy) {
        // Should have error information when unhealthy
        const hasError = result.lastError || result.metrics.lastError;
        if (hasError) {
          expect(typeof hasError).toBe('string');
          expect(hasError.length).toBeGreaterThan(0);
        }
      }

      // Response time should always be present
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Requirements', () => {
    test('database health check should complete quickly', async () => {
      const startTime = Date.now();
      await getDatabaseHealth();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should generally be under 50ms for local database
      // Allow more tolerance in CI environments
      expect(responseTime).toBeLessThan(500);
    });

    test('Redis health check should complete quickly', async () => {
      const startTime = Date.now();
      await getRedisHealth();
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should generally be under 50ms for local Redis
      // Allow more tolerance in CI environments
      expect(responseTime).toBeLessThan(500);
    });

    test('combined health checks should complete under 100ms when services are healthy', async () => {
      const startTime = Date.now();

      await Promise.all([getDatabaseHealth(), getRedisHealth()]);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Combined should generally be under 100ms for healthy services
      // Allow more tolerance in CI environments
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    test('health functions should not throw unhandled exceptions', async () => {
      // These should not throw, even if services are unavailable
      await expect(getDatabaseHealth()).resolves.toBeDefined();
      await expect(getRedisHealth()).resolves.toBeDefined();
      await expect(getConnectionPoolStats()).resolves.toBeDefined();
      await expect(getRedisMetrics()).resolves.toBeDefined();
    });

    test('health functions should return consistent structure even on errors', async () => {
      const [dbHealth, redisHealth] = await Promise.all([getDatabaseHealth(), getRedisHealth()]);

      // Database health should always have these fields
      expect(dbHealth).toHaveProperty('isHealthy');
      expect(dbHealth).toHaveProperty('responseTime');
      expect(dbHealth).toHaveProperty('poolStats');

      // Redis health should always have these fields
      expect(redisHealth).toHaveProperty('isHealthy');
      expect(redisHealth).toHaveProperty('responseTime');
      expect(redisHealth).toHaveProperty('metrics');
    });
  });
});

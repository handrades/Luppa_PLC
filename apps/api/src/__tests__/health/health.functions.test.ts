/**
 * Health configuration function tests - testing individual functions
 * Tests the health check functions independently
 */

import {
  getConnectionPoolStats,
  getDatabaseHealth,
} from "../../config/database";
import { getRedisHealth, getRedisMetrics } from "../../config/redis";

describe("Health Configuration Functions", () => {
  describe("Database Health Functions", () => {
    test("getDatabaseHealth should return health information", async () => {
      const result = await getDatabaseHealth();

      expect(result).toHaveProperty("isHealthy");
      expect(result).toHaveProperty("responseTime");
      expect(result).toHaveProperty("poolStats");

      expect(typeof result.isHealthy).toBe("boolean");
      expect(typeof result.responseTime).toBe("number");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);

      // Validate pool stats structure
      expect(result.poolStats).toHaveProperty("isConnected");
      expect(result.poolStats).toHaveProperty("poolConfig");
      expect(typeof result.poolStats.isConnected).toBe("boolean");
    }, 10000);

    test("getConnectionPoolStats should return pool configuration", async () => {
      const result = await getConnectionPoolStats();

      expect(result).toHaveProperty("isConnected");
      expect(result).toHaveProperty("poolConfig");

      expect(typeof result.isConnected).toBe("boolean");

      const config = result.poolConfig;
      expect(config.min).toBeGreaterThanOrEqual(0);
      expect(config.max).toBeGreaterThanOrEqual(config.min);
      expect(config.connectionTimeoutMillis).toBeGreaterThanOrEqual(0);
      expect(config.idleTimeoutMillis).toBeGreaterThanOrEqual(0);
    }, 10000);
  });

  describe("Redis Health Functions", () => {
    test("getRedisHealth should return health information", async () => {
      const result = await getRedisHealth();

      expect(result).toHaveProperty("isHealthy");
      expect(result).toHaveProperty("responseTime");
      expect(result).toHaveProperty("metrics");

      expect(typeof result.isHealthy).toBe("boolean");
      expect(typeof result.responseTime).toBe("number");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);

      expect(result.metrics).toHaveProperty("isConnected");
      expect(typeof result.metrics.isConnected).toBe("boolean");
    }, 10000);

    test("getRedisMetrics should return connection status", async () => {
      const result = await getRedisMetrics();

      expect(result).toHaveProperty("isConnected");
      expect(typeof result.isConnected).toBe("boolean");
    }, 10000);
  });

  describe("Error Handling", () => {
    test("health functions should not throw unhandled exceptions", async () => {
      await expect(getDatabaseHealth()).resolves.toBeDefined();
      await expect(getRedisHealth()).resolves.toBeDefined();
      await expect(getConnectionPoolStats()).resolves.toBeDefined();
      await expect(getRedisMetrics()).resolves.toBeDefined();
    }, 15000);

    test("health functions should handle errors gracefully", async () => {
      // Test that functions return proper structure even when services fail
      const dbResult = await getDatabaseHealth();
      const redisResult = await getRedisHealth();

      // Database health should always return proper structure
      expect(dbResult).toHaveProperty("isHealthy");
      expect(dbResult).toHaveProperty("responseTime");
      expect(dbResult).toHaveProperty("poolStats");
      expect(typeof dbResult.isHealthy).toBe("boolean");

      // Redis health should always return proper structure
      expect(redisResult).toHaveProperty("isHealthy");
      expect(redisResult).toHaveProperty("responseTime");
      expect(redisResult).toHaveProperty("metrics");
      expect(typeof redisResult.isHealthy).toBe("boolean");

      // If unhealthy, error info may be present
      if (!dbResult.isHealthy && dbResult.lastError) {
        expect(typeof dbResult.lastError).toBe("string");
      }
      if (!redisResult.isHealthy && redisResult.metrics.lastError) {
        expect(typeof redisResult.metrics.lastError).toBe("string");
      }
    }, 15000);
  });
});

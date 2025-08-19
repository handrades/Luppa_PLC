/**
 * Basic Health endpoint tests - simplified for reliable testing
 * Tests the core functionality without complex integration dependencies
 */

import request from "supertest";
import createApp from "../../app";
import type { Application } from "express";

describe("Health Endpoint Basic Tests", () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  describe("GET /health", () => {
    test("should return a valid health response", async () => {
      const response = await request(app)
        .get("/health")
        .expect("Content-Type", /json/);

      // Should return either 200 or 503 based on service status
      expect([200, 503]).toContain(response.status);

      // Validate response structure
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
        uptime: expect.any(Number),
        database: expect.objectContaining({
          status: expect.stringMatching(/^(connected|disconnected)$/),
          responseTime: expect.any(Number),
        }),
        redis: expect.objectContaining({
          status: expect.stringMatching(/^(connected|disconnected)$/),
          responseTime: expect.any(Number),
        }),
      });
    });

    test("should return valid timestamp format", async () => {
      const response = await request(app).get("/health");

      // Validate timestamp is valid ISO string
      expect(new Date(response.body.timestamp).toISOString()).toBe(
        response.body.timestamp,
      );
    });

    test("should be accessible without authentication", async () => {
      const response = await request(app).get("/health");

      // Should not return 401 Unauthorized
      expect(response.status).not.toBe(401);
      expect([200, 503]).toContain(response.status);
    });

    test("should return structured JSON parseable by monitoring systems", async () => {
      const response = await request(app).get("/health");

      // Required monitoring fields
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("database");
      expect(response.body).toHaveProperty("redis");

      // Valid JSON structure
      expect(() => JSON.stringify(response.body)).not.toThrow();
    });

    test("should have reasonable response times", async () => {
      const startTime = Date.now();
      await request(app).get("/health");
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      // Should be reasonable for CI environment
      expect(responseTime).toBeLessThan(5000);
    }, 10000);

    test("should include deployment timestamp when environment variable is set", async () => {
      const originalTimestamp = process.env.DEPLOYMENT_TIMESTAMP;
      const testTimestamp = "2025-08-09T10:30:00.000Z";

      process.env.DEPLOYMENT_TIMESTAMP = testTimestamp;

      // Create fresh app instance to pick up the new environment variable
      const freshApp = createApp();
      const response = await request(freshApp).get("/health");

      expect(response.body.deploymentTimestamp).toBe(testTimestamp);

      // Restore original value
      if (originalTimestamp) {
        process.env.DEPLOYMENT_TIMESTAMP = originalTimestamp;
      } else {
        delete process.env.DEPLOYMENT_TIMESTAMP;
      }
    });

    test("should return database connection pool information when available", async () => {
      const response = await request(app).get("/health");

      if (
        response.body.database.status === "connected" &&
        response.body.database.connectionPool
      ) {
        const pool = response.body.database.connectionPool;

        expect(pool).toHaveProperty("poolConfig");
        expect(pool.poolConfig).toHaveProperty("min");
        expect(pool.poolConfig).toHaveProperty("max");
        expect(pool.poolConfig.min).toBeGreaterThan(0);
        expect(pool.poolConfig.max).toBeGreaterThanOrEqual(pool.poolConfig.min);
      }
    });

    test("should return Redis metrics when connected", async () => {
      const response = await request(app).get("/health");

      if (response.body.redis.status === "connected") {
        // Check memory usage if available
        if (response.body.redis.memoryUsage) {
          expect(response.body.redis.memoryUsage).toHaveProperty("used");
          expect(response.body.redis.memoryUsage.used).toBeGreaterThanOrEqual(
            0,
          );
        }

        // Check performance metrics if available
        if (response.body.redis.performance) {
          expect(response.body.redis.performance).toHaveProperty("hitRatio");
          expect(
            response.body.redis.performance.hitRatio,
          ).toBeGreaterThanOrEqual(0);
          expect(response.body.redis.performance.hitRatio).toBeLessThanOrEqual(
            100,
          );
        }
      }
    });
  });
});

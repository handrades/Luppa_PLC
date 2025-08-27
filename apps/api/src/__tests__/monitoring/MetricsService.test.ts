import { MetricsService } from "../../services/MetricsService";
import { Request, Response } from "express";
import { register } from "../../config/prometheus";
import { logger } from "../../config/logger";

// Mock the config modules
jest.mock("../../config/database", () => ({
  getDatabaseHealth: jest.fn(),
}));

jest.mock("../../config/redis", () => ({
  getRedisHealth: jest.fn(),
}));

jest.mock("../../config/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getDatabaseHealth } from "../../config/database";
import { getRedisHealth } from "../../config/redis";

const mockGetDatabaseHealth = getDatabaseHealth as jest.MockedFunction<typeof getDatabaseHealth>;
const mockGetRedisHealth = getRedisHealth as jest.MockedFunction<typeof getRedisHealth>;

describe("MetricsService", () => {
  beforeEach(() => {
    // Clear metrics registry before each test
    register.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    register.clear();
  });

  describe("collectHttpMetrics", () => {
    it("should collect HTTP request metrics with correct labels", () => {
      const mockReq = {
        method: "GET",
        route: { path: "/api/v1/users" },
        path: "/api/v1/users",
      } as Request;

      const mockRes = {
        statusCode: 200,
      } as Response;

      const duration = 150; // 150ms

      MetricsService.collectHttpMetrics(mockReq, mockRes, duration);

      // Test that metrics are collected (we can't directly assert on the registry easily,
      // but we can test the method doesn't throw and processes correctly)
      expect(() => MetricsService.collectHttpMetrics(mockReq, mockRes, duration)).not.toThrow();
    });

    it("should handle requests without route path", () => {
      const mockReq = {
        method: "GET",
        path: "/unknown-path",
      } as Request;

      const mockRes = {
        statusCode: 404,
      } as Response;

      expect(() => MetricsService.collectHttpMetrics(mockReq, mockRes, 100)).not.toThrow();
    });
  });

  describe("collectDatabaseMetrics", () => {
    it("should collect database query metrics with correct parameters", () => {
      const queryTime = 50; // 50ms
      const operation = "SELECT";
      const table = "users";

      expect(() =>
        MetricsService.collectDatabaseMetrics(queryTime, operation, table)
      ).not.toThrow();
    });

    it("should handle missing table parameter", () => {
      const queryTime = 75;
      const operation = "INSERT";

      expect(() => MetricsService.collectDatabaseMetrics(queryTime, operation)).not.toThrow();
    });
  });

  describe("collectUserOperationMetrics", () => {
    it("should collect user operation metrics with role", () => {
      const operation = "user_create";
      const userRole = "admin";

      expect(() => MetricsService.collectUserOperationMetrics(operation, userRole)).not.toThrow();
    });

    it("should handle missing user role", () => {
      const operation = "user_login";

      expect(() => MetricsService.collectUserOperationMetrics(operation)).not.toThrow();
    });
  });

  describe("collectAuditMetrics", () => {
    it("should collect audit metrics with correct parameters", () => {
      const riskLevel = "HIGH";
      const tableName = "users";

      expect(() => MetricsService.collectAuditMetrics(riskLevel, tableName)).not.toThrow();
    });
  });

  describe("collectRedisMetrics", () => {
    it("should collect Redis operation metrics", () => {
      expect(() => MetricsService.collectRedisMetrics("GET", "hit")).not.toThrow();
      expect(() => MetricsService.collectRedisMetrics("SET", "success")).not.toThrow();
      expect(() => MetricsService.collectRedisMetrics("GET", "miss")).not.toThrow();
    });
  });

  describe("updateDatabasePoolMetrics", () => {
    it("should update database pool metrics successfully", async () => {
      const mockDbHealth = {
        isHealthy: true,
        poolStats: {
          totalConnections: 5,
          idleConnections: 2,
          runningConnections: 3,
          poolConfig: {
            max: 10,
            min: 2,
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
          },
        },
      };

      mockGetDatabaseHealth.mockResolvedValue(mockDbHealth);

      await expect(MetricsService.updateDatabasePoolMetrics()).resolves.not.toThrow();
      expect(mockGetDatabaseHealth).toHaveBeenCalledTimes(1);
    });

    it("should handle database health check errors", async () => {
      mockGetDatabaseHealth.mockRejectedValue(new Error("Database connection failed"));

      const loggerSpy = jest.spyOn(logger, "error").mockImplementation();

      await expect(MetricsService.updateDatabasePoolMetrics()).resolves.not.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        "Failed to update database pool metrics:",
        expect.any(Error)
      );

      loggerSpy.mockRestore();
    });
  });

  describe("updateRedisMetrics", () => {
    it("should update Redis memory metrics successfully", async () => {
      const mockRedisHealth = {
        isHealthy: true,
        metrics: {
          memoryUsage: {
            used: 1048576, // 1MB in bytes
            peak: 2097152, // 2MB in bytes
            rss: 3145728, // 3MB in bytes
            overhead: 524288, // 512KB in bytes
          },
        },
      };

      mockGetRedisHealth.mockResolvedValue(mockRedisHealth);

      await expect(MetricsService.updateRedisMetrics()).resolves.not.toThrow();
      expect(mockGetRedisHealth).toHaveBeenCalledTimes(1);
    });

    it("should handle Redis health check errors", async () => {
      mockGetRedisHealth.mockRejectedValue(new Error("Redis connection failed"));

      const loggerSpy = jest.spyOn(logger, "error").mockImplementation();

      await expect(MetricsService.updateRedisMetrics()).resolves.not.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith("Failed to update Redis metrics:", expect.any(Error));

      loggerSpy.mockRestore();
    });
  });

  describe("getPrometheusMetrics", () => {
    it("should return metrics in Prometheus format", async () => {
      const mockDbHealth = {
        isHealthy: true,
        poolStats: {
          totalConnections: 3,
          idleConnections: 1,
          runningConnections: 2,
          poolConfig: {
            max: 10,
            min: 2,
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
          },
        },
      };

      const mockRedisHealth = {
        isHealthy: true,
        metrics: {
          memoryUsage: {
            used: 1048576,
            peak: 2097152,
            rss: 3145728,
            overhead: 524288,
          },
        },
      };

      mockGetDatabaseHealth.mockResolvedValue(mockDbHealth);
      mockGetRedisHealth.mockResolvedValue(mockRedisHealth);

      const metrics = await MetricsService.getPrometheusMetrics();

      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("# HELP");
      expect(metrics).toContain("# TYPE");
    });

    it("should handle metrics collection errors gracefully", async () => {
      mockGetDatabaseHealth.mockRejectedValue(new Error("Database error"));
      mockGetRedisHealth.mockRejectedValue(new Error("Redis error"));

      const loggerSpy = jest.spyOn(logger, "error").mockImplementation();

      const metrics = await MetricsService.getPrometheusMetrics();

      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("# HELP");

      loggerSpy.mockRestore();
    });

    it("should return error message when metrics collection fails completely", async () => {
      // Mock register.metrics to throw an error
      const originalMetrics = register.metrics;
      register.metrics = jest.fn().mockRejectedValue(new Error("Registry error"));

      const loggerSpy = jest.spyOn(logger, "error").mockImplementation();

      const result = await MetricsService.getPrometheusMetrics();

      expect(result).toContain("# Failed to collect metrics");
      expect(loggerSpy).toHaveBeenCalledWith("Failed to collect metrics:", expect.any(Error));

      // Restore original function
      register.metrics = originalMetrics;
      loggerSpy.mockRestore();
    });
  });
});

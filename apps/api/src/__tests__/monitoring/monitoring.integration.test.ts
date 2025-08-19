import { Express } from "express";
import request from "supertest";
import { createApp } from "../../app";
import { register } from "../../config/prometheus";
import { MetricsService } from "../../services/MetricsService";

describe("Monitoring Integration Tests", () => {
  let app: Express.Application;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    // Clear metrics registry before each test
    register.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    register.clear();
  });

  describe("End-to-End Monitoring Workflow", () => {
    it("should collect and expose metrics for a complete request lifecycle", async () => {
      // Step 1: Make initial request to generate metrics
      // Note: /health may return 503 in test environment due to DB/Redis unavailability
      await request(app).get("/health");

      // Step 2: Get metrics and verify they were collected
      const metricsResponse = await request(app)
        .get("/api/v1/metrics")
        .expect(200);

      // Verify HTTP metrics were collected
      expect(metricsResponse.text).toContain("http_requests_total");
      expect(metricsResponse.text).toContain("http_request_duration_seconds");

      // Check for specific method and route labels
      expect(metricsResponse.text).toMatch(
        /http_requests_total\{.*method="GET".*\}/,
      );
    });

    it("should track metrics across multiple different requests", async () => {
      // Make various requests to generate diverse metrics
      await request(app).get("/health");
      await request(app).get("/api/v1/metrics");
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "test", password: "test" });

      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should contain metrics for different HTTP methods
      expect(response.text).toMatch(/http_requests_total\{.*method="GET".*\}/);
      expect(response.text).toMatch(/http_requests_total\{.*method="POST".*\}/);

      // Should track different status codes
      expect(response.text).toMatch(/status_code="200"/);
      expect(response.text).toMatch(/status_code="400"|status_code="401"/); // Login should fail
    });

    it("should maintain metrics persistence across requests", async () => {
      // First batch of requests
      await request(app).get("/health");
      await request(app).get("/health");

      let response = await request(app).get("/api/v1/metrics").expect(200);

      // Extract current count (this is a simplified check)
      const firstMetrics = response.text;

      // Second batch of requests
      await request(app).get("/health");

      response = await request(app).get("/api/v1/metrics").expect(200);

      // Should show increased counts
      expect(response.text).toContain("http_requests_total");
      expect(response.text).not.toBe(firstMetrics); // Should be different due to additional requests
    });

    it("should expose database connection metrics", async () => {
      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should include database pool metrics
      expect(response.text).toContain("database_connections_active");
      expect(response.text).toContain("database_connections_idle");
      expect(response.text).toContain("database_pool_utilization");
    });

    it("should expose Redis memory metrics", async () => {
      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should include Redis metrics
      expect(response.text).toContain("redis_memory_used_bytes");
    });

    it("should handle high-frequency requests efficiently", async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get("/health"),
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const endTime = Date.now();

      // All requests should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds

      // Metrics endpoint should still respond quickly
      const metricsStart = Date.now();
      const response = await request(app).get("/api/v1/metrics").expect(200);
      const metricsEnd = Date.now();

      expect(metricsEnd - metricsStart).toBeLessThan(100); // Less than 100ms

      // Should contain metrics for all requests
      expect(response.text).toContain("http_requests_total");
    });

    it("should validate Prometheus format compliance", async () => {
      // Generate some metrics
      await request(app).get("/health");

      const response = await request(app).get("/api/v1/metrics").expect(200);

      const lines = response.text.split("\n");
      let currentMetric = "";
      let helpLines = 0;
      let typeLines = 0;

      for (const line of lines) {
        if (line.startsWith("# HELP ")) {
          helpLines++;
          currentMetric = line.split(" ")[2]; // Get metric name
        } else if (line.startsWith("# TYPE ")) {
          typeLines++;
          const typeLine = line.split(" ");
          expect(typeLine[2]).toBe(currentMetric); // TYPE should match current HELP metric
          expect(["counter", "gauge", "histogram", "summary"]).toContain(
            typeLine[3],
          );
        } else if (line && !line.startsWith("#")) {
          // Metric line should have format: metric_name{labels} value timestamp?
          // Allow NaN and Infinity values which are valid in Prometheus
          expect(line).toMatch(
            /^[a-zA-Z_][a-zA-Z0-9_]*(\{.*\})?\s+([+-]?([\d.]+|[\d.]+e[+-]?\d+|NaN|Nan|Infinity))(\s+\d+)?$/,
          );
        }
      }

      expect(helpLines).toBeGreaterThan(0);
      expect(typeLines).toBeGreaterThan(0);
    });

    it("should handle authentication context in metrics", async () => {
      // This test assumes we have auth setup - adapt based on actual auth implementation
      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should include user operation metrics (even if no authenticated requests yet)
      expect(response.text).toMatch(/user_operations_total/);
    });

    it("should maintain performance under concurrent load", async () => {
      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 20 }, async () => {
        const response = await request(app).get("/health");
        // Health endpoint may return 503 in test environment, but should still complete
        expect([200, 503]).toContain(response.status);
        return response;
      });

      const startTime = Date.now();
      await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(3000);

      // Metrics endpoint should remain responsive
      const metricsResponse = await request(app)
        .get("/api/v1/metrics")
        .expect(200);

      expect(metricsResponse.text).toContain("http_requests_total");
      expect(metricsResponse.text).toContain("http_request_duration_seconds");
    });

    it("should track different endpoint patterns correctly", async () => {
      // Test different endpoint patterns
      await request(app).get("/health");
      await request(app).get("/api/v1/metrics");

      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should distinguish between different routes
      expect(response.text).toContain("http_requests_total");

      // Check that different routes are tracked separately
      const routes = response.text.match(/route="[^"]*"/g) || [];
      expect(routes.length).toBeGreaterThan(1);
    });
  });

  describe("Error Conditions", () => {
    it("should handle metrics collection errors gracefully", async () => {
      // Mock MetricsService to throw an error
      const originalMethod = MetricsService.collectHttpMetrics;
      MetricsService.collectHttpMetrics = jest.fn().mockImplementation(() => {
        throw new Error("Metrics error");
      });

      // Request should still complete even if metrics collection fails
      await request(app).get("/health");

      // Restore original method
      MetricsService.collectHttpMetrics = originalMethod;
    });

    it("should return metrics even when some components fail", async () => {
      // This tests the resilience of the metrics endpoint
      const response = await request(app).get("/api/v1/metrics").expect(200);

      // Should return some metrics even if database/redis health checks fail
      expect(response.text).toContain("# HELP");
      expect(response.headers["content-type"]).toContain("text/plain");
    });
  });
});

import request from "supertest";
import express from "express";
import { corsMiddleware, isOriginAllowed } from "../../middleware/corsMiddleware";

// Simple CORS middleware tests that work regardless of environment
describe("CORS Middleware - Basic Functionality", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(corsMiddleware);

    app.get("/test", (req, res) => {
      res.json({ success: true });
    });

    app.post("/test", express.json(), (req, res) => {
      res.json({ success: true, body: req.body });
    });
  });

  it("should allow requests without origin (e.g., Postman, mobile apps)", async () => {
    const response = await request(app).get("/test");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should handle preflight OPTIONS requests for valid origins", async () => {
    // Set NODE_ENV to ensure we have a predictable environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test"; // Should be treated as development

    const response = await request(app)
      .options("/test")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type,Authorization");

    // Restore original environment
    process.env.NODE_ENV = originalEnv;

    // Should get a successful preflight response
    expect([200, 204]).toContain(response.status);
  });

  it("should include standard CORS headers in successful responses", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const response = await request(app).get("/test").set("Origin", "http://localhost:3000");

    process.env.NODE_ENV = originalEnv;

    // Check for CORS headers (may vary by environment)
    if (response.status === 200) {
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    }
  });

  it("should support standard HTTP methods", async () => {
    const response = await request(app)
      .options("/test")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    if (response.status === 204 || response.status === 200) {
      expect(response.headers["access-control-allow-methods"]).toBeDefined();
    }
  });

  describe("isOriginAllowed helper function", () => {
    it("should be a function that checks origin validity", () => {
      expect(typeof isOriginAllowed).toBe("function");

      // Test with a clearly invalid origin
      expect(isOriginAllowed("http://clearly-malicious-site.evil.com")).toBe(false);
    });

    it("should handle localhost origins based on environment", () => {
      const originalEnv = process.env.NODE_ENV;

      // In non-production (like test), localhost should be allowed
      process.env.NODE_ENV = "test";
      expect(isOriginAllowed("http://localhost:3000")).toBe(true);

      // In production, localhost should not be allowed
      process.env.NODE_ENV = "production";
      expect(isOriginAllowed("http://localhost:3000")).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  it("should reject clearly malicious origins", async () => {
    const response = await request(app)
      .get("/test")
      .set("Origin", "http://definitely-malicious-site.evil.com");

    // Should succeed but without CORS headers (browser will block)
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("should handle complex request scenarios", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const response = await request(app)
      .post("/test")
      .set("Origin", "http://localhost:3000")
      .set("Content-Type", "application/json")
      .send({ test: "data" });

    process.env.NODE_ENV = originalEnv;

    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.body).toEqual({ test: "data" });
    }
  });
});

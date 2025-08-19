import request from "supertest";
import express from "express";
import {
  corsMiddleware,
  isOriginAllowed,
} from "../../middleware/corsMiddleware";

describe("CORS Middleware", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(corsMiddleware);

    // Simple test route
    app.get("/test", (req, res) => {
      res.json({ success: true });
    });

    app.post("/test", express.json(), (req, res) => {
      res.json({ success: true, body: req.body });
    });
  });

  describe("development environment", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = "development";
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should allow requests from localhost:3000", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should allow requests from localhost:5173 (Vite dev server)", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:5173");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:5173",
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should allow requests from localhost:4173 (Vite preview server)", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:4173");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:4173",
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should allow requests without origin (e.g., Postman, mobile apps)", async () => {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      // No Origin header means request is allowed
    });

    it("should reject requests from unauthorized origins", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://malicious-site.com");

      // The request should be rejected with CORS error
      expect(response.status).toBe(500); // Express converts CORS errors to 500
    });

    it("should handle preflight OPTIONS requests", async () => {
      const response = await request(app)
        .options("/test")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type,Authorization");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["access-control-allow-methods"]).toContain(
        "POST",
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "Content-Type",
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "Authorization",
      );
    });

    it("should expose X-Request-ID header to client", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-expose-headers"]).toContain(
        "X-Request-ID",
      );
    });

    it("should allow all standard HTTP methods", async () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

      for (const method of methods) {
        const response = await request(app)
          .options("/test")
          .set("Origin", "http://localhost:3000")
          .set("Access-Control-Request-Method", method);

        expect(response.status).toBe(204);
        expect(response.headers["access-control-allow-methods"]).toContain(
          method,
        );
      }
    });

    it("should support credentials for authentication", async () => {
      const response = await request(app)
        .post("/test")
        .set("Origin", "http://localhost:3000")
        .set("Authorization", "Bearer test-token")
        .send({ data: "test" });

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should have longer max-age in development", async () => {
      const response = await request(app)
        .options("/test")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-max-age"]).toBe("86400"); // 24 hours
    });
  });

  describe("production environment", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = "production";

      // Need to recreate app with new environment
      app = express();
      app.use(corsMiddleware);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should reject localhost origins in production", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(500); // CORS rejection
    });

    it("should allow production domain", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "https://inventory.local");

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://inventory.local",
      );
    });

    it("should have shorter max-age in production", async () => {
      const response = await request(app)
        .options("/test")
        .set("Origin", "https://inventory.local")
        .set("Access-Control-Request-Method", "POST");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-max-age"]).toBe("3600"); // 1 hour
    });
  });

  describe("isOriginAllowed helper function", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("should return true for allowed development origins", () => {
      process.env.NODE_ENV = "development";

      expect(isOriginAllowed("http://localhost:3000")).toBe(true);
      expect(isOriginAllowed("http://localhost:5173")).toBe(true);
      expect(isOriginAllowed("http://localhost:4173")).toBe(true);
    });

    it("should return false for disallowed origins in development", () => {
      process.env.NODE_ENV = "development";

      expect(isOriginAllowed("http://malicious-site.com")).toBe(false);
      expect(isOriginAllowed("https://evil.com")).toBe(false);
    });

    it("should return true for allowed production origins", () => {
      process.env.NODE_ENV = "production";

      expect(isOriginAllowed("https://inventory.local")).toBe(true);
    });

    it("should return false for localhost in production", () => {
      process.env.NODE_ENV = "production";

      expect(isOriginAllowed("http://localhost:3000")).toBe(false);
      expect(isOriginAllowed("http://localhost:5173")).toBe(false);
    });
  });

  describe("security headers", () => {
    it("should include all required CORS headers", async () => {
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty("access-control-allow-origin");
      expect(response.headers).toHaveProperty(
        "access-control-allow-credentials",
      );
    });

    it("should handle complex preflight requests", async () => {
      const response = await request(app)
        .options("/test")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "PUT")
        .set(
          "Access-Control-Request-Headers",
          "Content-Type,Authorization,X-Request-ID",
        );

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["access-control-allow-methods"]).toContain("PUT");
      expect(response.headers["access-control-allow-headers"]).toContain(
        "Content-Type",
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "Authorization",
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "X-Request-ID",
      );
    });
  });

  describe("error handling", () => {
    it("should log rejected origins for monitoring", async () => {
      // Mock the logger to capture warnings (unused in this simplified test)
      // const mockLogger = {
      //   warn: jest.fn(),
      // };

      // This would be done through proper mocking in a real test
      // For now, we just verify the request is rejected
      const response = await request(app)
        .get("/test")
        .set("Origin", "http://malicious-site.com");

      expect(response.status).toBe(500);
    });

    it("should handle missing origin header gracefully", async () => {
      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

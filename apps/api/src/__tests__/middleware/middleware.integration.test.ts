import request from "supertest";
import express from "express";
import { securityMiddleware } from "../../middleware/securityMiddleware";
import { requestIdMiddleware } from "../../middleware/requestId";
import { corsMiddleware } from "../../middleware/corsMiddleware";
import { compressionMiddleware } from "../../middleware/compressionMiddleware";
import { loggingMiddleware } from "../../middleware/loggingMiddleware";
import { validate } from "../../middleware/validationMiddleware";
import { errorHandler, notFoundHandler } from "../../middleware/errorHandler";
import { emailSchema, nameSchema } from "../../schemas/commonSchemas";
import Joi from "joi";

// Mock the logger for integration tests
jest.mock("../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger: mockLogger } = require("../../config/logger");

describe("Middleware Integration Tests", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Set up middleware in the exact order specified in the story
    // 1. Security headers middleware (first for security)
    app.use(securityMiddleware);

    // 2. Request ID middleware (for request tracing)
    app.use(requestIdMiddleware);

    // 3. CORS middleware (for cross-origin support)
    app.use(corsMiddleware);

    // 4. Compression middleware (for response optimization)
    app.use(compressionMiddleware);

    // 5. Body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // 6. Logging middleware (for request tracking)
    app.use(loggingMiddleware);

    // 7. Authentication middleware would go here (per-route basis)
    // 8. Audit context middleware would go here
    // 9. Metrics middleware would go here

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe("complete middleware stack flow", () => {
    it("should process request through all middleware layers correctly", async () => {
      // Test route with validation
      const userSchema = Joi.object({
        name: nameSchema,
        email: emailSchema,
      });

      app.post("/api/users", validate({ body: userSchema }), (req, res) => {
        res.status(201).json({
          success: true,
          user: req.body,
          headers: {
            requestId: req.id,
            origin: req.get("Origin"),
          },
        });
      });

      app.use(notFoundHandler);
      app.use(errorHandler);

      const userData = {
        name: "John Doe",
        email: "john.doe@example.com",
      };

      const response = await request(app)
        .post("/api/users")
        .set("Origin", "http://localhost:3000")
        .set("Accept-Encoding", "gzip")
        .set("User-Agent", "integration-test")
        .send(userData);

      // Verify response
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(userData);

      // Verify security headers are present
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");

      // Verify CORS headers
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");

      // Verify request ID is present
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body.headers.requestId).toBeDefined();

      // Verify logging occurred
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Incoming request",
        expect.objectContaining({
          method: "POST",
          url: "/api/users",
          requestId: expect.any(String),
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Request completed",
        expect.objectContaining({
          method: "POST",
          url: "/api/users",
          statusCode: 201,
          requestId: expect.any(String),
        }),
      );
    });

    it("should handle validation errors through complete stack", async () => {
      const userSchema = Joi.object({
        name: nameSchema,
        email: emailSchema,
      });

      app.post("/api/users", validate({ body: userSchema }), (req, res) => {
        res.status(201).json({ success: true });
      });

      app.use(notFoundHandler);
      app.use(errorHandler);

      const invalidData = {
        name: "", // Invalid: empty
        email: "not-an-email", // Invalid: not an email
      };

      const response = await request(app)
        .post("/api/users")
        .set("Origin", "http://localhost:3000")
        .set("User-Agent", "integration-test")
        .send(invalidData);

      // Verify error response
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details).toHaveLength(2);

      // Verify security headers are still present on error
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["x-frame-options"]).toBe("DENY");

      // Verify CORS headers are still present
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );

      // Verify request ID is present in error response
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });

    it("should handle CORS preflight requests properly", async () => {
      app.post("/api/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .options("/api/test")
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
      expect(response.headers["access-control-allow-credentials"]).toBe("true");

      // Security headers should still be present
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["x-frame-options"]).toBe("DENY");
    });

    it("should compress large JSON responses through middleware stack", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description:
            "This is a test item with a long description that helps make the response larger for compression testing",
          metadata: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
          },
        })),
      };

      app.get("/api/large-data", (req, res) => {
        res.json(largeData);
      });

      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get("/api/large-data")
        .set("Origin", "http://localhost:3000")
        .set("Accept-Encoding", "gzip")
        .set("User-Agent", "integration-test");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(largeData);

      // Verify compression occurred
      expect(response.headers["content-encoding"]).toBe("gzip");

      // All other middleware headers should still be present
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["x-request-id"]).toBeDefined();
    });

    it("should handle 404 errors through complete middleware stack", async () => {
      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get("/api/nonexistent")
        .set("Origin", "http://localhost:3000")
        .set("User-Agent", "integration-test");

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain(
        "Route GET /api/nonexistent not found",
      );

      // Verify all middleware headers are present even for 404
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
    });
  });

  describe("middleware ordering verification", () => {
    it("should ensure request ID is available to all subsequent middleware", async () => {
      let capturedRequestId: string | undefined;

      // Custom middleware to capture request ID
      app.use((req, res, next) => {
        capturedRequestId = req.id;
        next();
      });

      app.get("/test-id", (req, res) => {
        res.json({ requestId: req.id });
      });

      app.use(errorHandler);

      const response = await request(app)
        .get("/test-id")
        .set("User-Agent", "integration-test");

      expect(response.status).toBe(200);
      expect(response.body.requestId).toBeDefined();
      expect(capturedRequestId).toBeDefined();
      expect(capturedRequestId).toBe(response.body.requestId);
      expect(response.headers["x-request-id"]).toBe(response.body.requestId);
    });

    it("should ensure CORS headers are set before other middleware", async () => {
      let corsHeadersPresent = false;

      // Middleware to check if CORS headers are already set
      app.use((req, res, next) => {
        if (res.get("Access-Control-Allow-Origin")) {
          corsHeadersPresent = true;
        }
        next();
      });

      app.get("/test-cors-order", (req, res) => {
        res.json({ corsHeadersWerePresent: corsHeadersPresent });
      });

      const response = await request(app)
        .get("/test-cors-order")
        .set("Origin", "http://localhost:3000");

      expect(response.status).toBe(200);
      expect(response.body.corsHeadersWerePresent).toBe(true);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
    });

    it("should ensure security headers are set first", async () => {
      let securityHeadersPresent = false;

      // Middleware to check if security headers are already set
      app.use((req, res, next) => {
        if (res.get("X-Frame-Options") && res.get("Content-Security-Policy")) {
          securityHeadersPresent = true;
        }
        next();
      });

      app.get("/test-security-order", (req, res) => {
        res.json({ securityHeadersWerePresent: securityHeadersPresent });
      });

      const response = await request(app).get("/test-security-order");

      expect(response.status).toBe(200);
      expect(response.body.securityHeadersWerePresent).toBe(true);
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["content-security-policy"]).toBeDefined();
    });
  });

  describe("error propagation through middleware stack", () => {
    it("should propagate errors through all middleware layers", async () => {
      app.get("/test-error", (req, res, next) => {
        next(new Error("Test error"));
      });

      app.use(notFoundHandler);
      app.use(errorHandler);

      const response = await request(app)
        .get("/test-error")
        .set("Origin", "http://localhost:3000")
        .set("User-Agent", "integration-test");

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe("Internal server error");

      // Verify all middleware headers are present even during errors
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
      expect(response.headers["x-request-id"]).toBeDefined();
    });

    it("should handle validation errors with proper middleware context", async () => {
      const schema = Joi.object({
        required: Joi.string().required(),
      });

      app.post(
        "/test-validation-error",
        validate({ body: schema }),
        (req, res) => {
          res.json({ success: true });
        },
      );

      app.use(errorHandler);

      const response = await request(app)
        .post("/test-validation-error")
        .set("Origin", "http://localhost:3000")
        .set("User-Agent", "integration-test")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      // Verify middleware context is preserved
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.body.error.requestId).toBe(
        response.headers["x-request-id"],
      );
    });
  });

  describe("performance impact of middleware stack", () => {
    it("should complete requests within acceptable time limits", async () => {
      const startTime = Date.now();

      app.get("/performance-test", (req, res) => {
        res.json({ timestamp: Date.now() });
      });

      app.use(errorHandler);

      const response = await request(app)
        .get("/performance-test")
        .set("Origin", "http://localhost:3000")
        .set("Accept-Encoding", "gzip")
        .set("User-Agent", "performance-test");

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      // Verify all middleware ran successfully
      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["content-security-policy"]).toBeDefined();
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000",
      );
    });

    it("should handle concurrent requests efficiently", async () => {
      app.get("/concurrent-test", (req, res) => {
        res.json({ requestId: req.id, timestamp: Date.now() });
      });

      app.use(errorHandler);

      // Make 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get("/concurrent-test")
          .set("Origin", "http://localhost:3000")
          .set("User-Agent", "concurrent-test"),
      );

      const responses = await Promise.all(requests);

      // Verify all requests succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.requestId).toBeDefined();
        expect(response.headers["x-request-id"]).toBe(response.body.requestId);
      });

      // Verify all request IDs are unique
      const requestIds = responses.map((r) => r.body.requestId);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe("middleware compatibility", () => {
    it("should work with existing authentication middleware patterns", async () => {
      // Simulate authentication middleware
      app.use("/protected", (req, res, next) => {
        const authHeader = req.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        (
          req as express.Request & { user: { id: string; email: string } }
        ).user = {
          id: "user-123",
          email: "test@example.com",
        };
        next();
      });

      app.get("/protected/data", (req, res) => {
        res.json({
          data: "protected data",
          user: (
            req as express.Request & { user: { id: string; email: string } }
          ).user,
        });
      });

      app.use(errorHandler);

      // Test without auth token
      const unauthorizedResponse = await request(app)
        .get("/protected/data")
        .set("Origin", "http://localhost:3000");

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.headers["x-request-id"]).toBeDefined();

      // Test with auth token
      const authorizedResponse = await request(app)
        .get("/protected/data")
        .set("Origin", "http://localhost:3000")
        .set("Authorization", "Bearer valid-token");

      expect(authorizedResponse.status).toBe(200);
      expect(authorizedResponse.body.user.id).toBe("user-123");
      expect(authorizedResponse.headers["x-request-id"]).toBeDefined();
    });

    it("should work with existing audit middleware patterns", async () => {
      // Simulate audit middleware
      app.use((req, res, next) => {
        if (req.method !== "GET") {
          // Simulate audit context setup
          res.locals.auditContext = {
            userId:
              (req as express.Request & { user?: { id: string } }).user?.id ||
              "anonymous",
            action: `${req.method} ${req.path}`,
            timestamp: new Date().toISOString(),
          };
        }
        next();
      });

      app.post("/audit-test", (req, res) => {
        res.json({
          success: true,
          auditContext: res.locals.auditContext,
        });
      });

      app.use(errorHandler);

      const response = await request(app)
        .post("/audit-test")
        .set("Origin", "http://localhost:3000")
        .send({ data: "test" });

      expect(response.status).toBe(200);
      expect(response.body.auditContext).toBeDefined();
      expect(response.body.auditContext.action).toBe("POST /audit-test");
      expect(response.headers["x-request-id"]).toBeDefined();
    });
  });
});

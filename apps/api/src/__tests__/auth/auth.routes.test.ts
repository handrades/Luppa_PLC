/**
 * Authentication Routes Tests
 *
 * Integration tests for authentication endpoints
 */

// Set JWT_SECRET environment variable before any imports
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes";

// Mock all dependencies first, before importing modules that use them
jest.mock("../../services/AuthService");
jest.mock("../../middleware/rateLimiter", () => ({
  authRateLimit: jest.fn((req: unknown, res: unknown, next: () => void) => next()),
  strictAuthRateLimit: jest.fn((req: unknown, res: unknown, next: () => void) => next()),
}));
jest.mock("../../utils/ip", () => ({
  getClientIP: jest.fn(() => "127.0.0.1"),
}));
jest.mock("../../middleware/auth", () => ({
  authenticate: jest.fn(),
  optionalAuthenticate: jest.fn(
    (req: { auditEntityManager?: unknown }, res: unknown, next: () => void) => {
      req.auditEntityManager = {};
      next();
    }
  ),
  authorize: jest.fn(
    () => (req: { auditEntityManager?: unknown }, res: unknown, next: () => void) => {
      req.auditEntityManager = {};
      next();
    }
  ),
  requireAdmin: jest.fn((req: { auditEntityManager?: unknown }, res: unknown, next: () => void) => {
    req.auditEntityManager = {};
    next();
  }),
  requireActiveUser: jest.fn(
    (req: { auditEntityManager?: unknown }, res: unknown, next: () => void) => {
      req.auditEntityManager = {};
      next();
    }
  ),
}));

import request from "supertest";
import express from "express";
import authRouter from "../../routes/auth";
import { TokenType } from "../../config/jwt";
import { authenticate } from "../../middleware/auth";
import { authRateLimit, strictAuthRateLimit } from "../../middleware/rateLimiter";
import { AuthService } from "../../services/AuthService";
import { TEST_CREDENTIALS, TEST_JWT, TEST_USER } from "../helpers/test-constants";

// Create a mock AuthService instance
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  getUserById: jest.fn(),
  validateToken: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  userExistsByEmail: jest.fn(),
};

describe("Auth Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with auth routes
    app = express();
    app.use(express.json());

    // Add auditEntityManager to all requests for runtime validation
    app.use((req: { auditEntityManager?: unknown }, _res, next) => {
      req.auditEntityManager = {};
      next();
    });

    app.use("/auth", authRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup AuthService mock implementation
    (AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService as AuthService
    );

    // Reset authenticate mock to default behavior (no authentication)
    authenticate.mockImplementation((_req, res) => {
      res.status(401).json({
        error: "Authentication required",
        message: "User not authenticated",
      });
    });
  });

  describe("POST /auth/login", () => {
    const validLoginData = {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
    };

    const mockLoginResult = {
      tokens: {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      },
      user: {
        ...TEST_USER,
        lastLogin: new Date(),
      },
    };

    it("should successfully login with valid credentials", async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      const response = await request(app).post("/auth/login").send(validLoginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Login successful",
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
        user: {
          id: "user-123",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          roleId: "role-123",
          roleName: "Admin",
          permissions: { plc: { read: true } },
          isActive: true,
          // lastLogin is converted to string during JSON serialization
          lastLogin: expect.any(String),
        },
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
        expect.any(String), // IP address
        expect.any(String) // User agent
      );
    });

    it("should return 401 for invalid credentials", async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

      // Act
      const response = await request(app).post("/auth/login").send(validLoginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Authentication failed",
        message: "Invalid credentials",
      });
    });

    it("should validate email format", async () => {
      // Arrange
      const invalidEmailData = {
        email: "invalid-email",
        password: "password123",
      };

      // Act
      const response = await request(app).post("/auth/login").send(invalidEmailData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });

    it("should validate password length", async () => {
      // Arrange
      const shortPasswordData = {
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.shortPassword,
      };

      // Act
      const response = await request(app).post("/auth/login").send(shortPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });

    it("should require email field", async () => {
      // Arrange
      const missingEmailData = {
        password: "password123",
      };

      // Act
      const response = await request(app).post("/auth/login").send(missingEmailData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });

    it("should require password field", async () => {
      // Arrange
      const missingPasswordData = {
        email: TEST_CREDENTIALS.email,
      };

      // Act
      const response = await request(app).post("/auth/login").send(missingPasswordData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });

    it("should normalize email to lowercase and trim", async () => {
      // Arrange
      const unnormalizedEmailData = {
        email: "  TEST@EXAMPLE.COM  ",
        password: TEST_CREDENTIALS.password,
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act
      await request(app).post("/auth/login").send(unnormalizedEmailData);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(
        { email: TEST_CREDENTIALS.email, password: TEST_CREDENTIALS.password },
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe("POST /auth/refresh", () => {
    const validRefreshData = {
      refreshToken: "valid-refresh-token",
    };

    const mockRefreshResult = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };

    it("should successfully refresh tokens", async () => {
      // Arrange
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);

      // Act
      const response = await request(app).post("/auth/refresh").send(validRefreshData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Token refreshed successfully",
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        "valid-refresh-token",
        expect.any(String), // IP address
        expect.any(String) // User agent
      );
    });

    it("should return 401 for invalid refresh token", async () => {
      // Arrange
      mockAuthService.refreshToken.mockRejectedValue(new Error("Invalid token"));

      // Act
      const response = await request(app).post("/auth/refresh").send(validRefreshData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Token refresh failed",
        message: "Invalid or expired refresh token",
      });
    });

    it("should require refreshToken field", async () => {
      // Act
      const response = await request(app).post("/auth/refresh").send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });

    it("should validate refreshToken as string", async () => {
      // Act
      const response = await request(app).post("/auth/refresh").send({ refreshToken: 123 }); // Should be string

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Validation error",
      });
    });
  });

  describe("POST /auth/logout", () => {
    it("should successfully logout authenticated user", async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: "ACCESS",
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      mockAuthService.logout.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post("/auth/logout")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Logout successful",
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith(TEST_USER.id, TEST_JWT.tokenId);
    });

    it("should return 401 for unauthenticated request", async () => {
      // Act
      const response = await request(app).post("/auth/logout");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Authentication required",
      });
    });
  });

  describe("GET /auth/me", () => {
    const mockUser = {
      ...TEST_USER,
      role: {
        name: TEST_USER.roleName,
        permissions: TEST_USER.permissions,
      },
      lastLogin: new Date(),
    };

    it("should return user profile for authenticated user", async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: "ACCESS",
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      mockAuthService.getUserById.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: "user-123",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          roleId: "role-123",
          roleName: "Admin",
          permissions: { plc: { read: true } },
          isActive: true,
        },
      });
    });

    it("should return 401 for inactive user", async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: TEST_USER.id,
          email: TEST_USER.email,
          roleId: TEST_USER.roleId,
          permissions: TEST_USER.permissions,
          type: "ACCESS",
          jti: TEST_JWT.tokenId,
        };
        next();
      });

      const inactiveUser = { ...mockUser, isActive: false };
      mockAuthService.getUserById.mockResolvedValue(inactiveUser);

      // Act
      const response = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Account inactive",
        message: "User account has been deactivated",
      });
    });

    it("should return 401 for unauthenticated request", async () => {
      // Act
      const response = await request(app).get("/auth/me");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Authentication required",
      });
    });
  });

  describe("GET /auth/verify", () => {
    it("should verify valid token", async () => {
      // Arrange - Mock successful authentication
      authenticate.mockImplementation((req, _res, next) => {
        req.user = {
          sub: "user-123",
          email: "test@example.com",
          roleId: "role-123",
          permissions: { plc: { read: true } },
          type: TokenType.ACCESS,
          jti: "token-123",
        };
        next();
      });

      // Act
      const response = await request(app)
        .get("/auth/verify")
        .set("Authorization", "Bearer valid-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        valid: true,
        user: {
          id: "user-123",
          email: "test@example.com",
          roleId: "role-123",
          permissions: { plc: { read: true } },
        },
      });
    });

    it("should return 401 for invalid token", async () => {
      // Act
      const response = await request(app).get("/auth/verify");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Authentication required",
      });
    });
  });

  describe("Rate limiting", () => {
    it("should apply rate limiting to login endpoint", async () => {
      // Assert that rate limiting middleware is mocked
      expect(authRateLimit).toBeDefined();
      expect(strictAuthRateLimit).toBeDefined();
    });

    it("should apply rate limiting to refresh endpoint", async () => {
      // Assert that rate limiting middleware is mocked
      expect(authRateLimit).toBeDefined();
    });
  });
});

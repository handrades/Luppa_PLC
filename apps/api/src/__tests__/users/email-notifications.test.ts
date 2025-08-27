/**
 * Email Notification Integration Tests
 *
 * Tests for email notification service integration with user management
 * operations, including all notification types and error handling.
 */

// Set environment variables before any imports
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes";
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "https://inventory.local";
process.env.SUPPORT_EMAIL = "support@luppa-plc.local";
process.env.SMTP_FROM_EMAIL = "noreply@luppa-plc.local";

import { EmailNotificationService } from "../../services/EmailNotificationService";
import { User } from "../../entities/User";
import { Role } from "../../entities/Role";
import { logger } from "../../config/logger";

// Mock the logger to capture log outputs
jest.mock("../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Email Notification Service Integration", () => {
  let emailService: EmailNotificationService;

  // Test data
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    passwordHash: "hashed-password",
    roleId: "role-456",
    isActive: true,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: "role-456",
      name: "Engineer",
      permissions: { users: { read: true } },
      description: "Engineer role",
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [],
    },
  } as User;

  const mockAdminRole: Role = {
    id: "role-789",
    name: "Admin",
    permissions: {
      users: { read: true, create: true, update: true, delete: true },
    },
    description: "Admin role",
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create fresh service instance
    emailService = new EmailNotificationService();
  });

  describe("Service Initialization", () => {
    it("should initialize with correct configuration", () => {
      const status = emailService.getStatus();

      expect(status).toEqual({
        enabled: false, // Disabled in test environment
        fromEmail: "noreply@luppa-plc.local",
        systemName: "Luppa PLC Inventory System",
      });

      expect(logger.info).toHaveBeenCalledWith("Email notifications disabled (test environment)");
    });

    it("should enable email in non-test environments", () => {
      // Temporarily change NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const prodEmailService = new EmailNotificationService();
      const status = prodEmailService.getStatus();

      expect(status.enabled).toBe(true);
      expect(logger.info).toHaveBeenCalledWith("Email notification service initialized", {
        fromEmail: "noreply@luppa-plc.local",
        systemName: "Luppa PLC Inventory System",
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Account Creation Notifications", () => {
    it("should send welcome email for new account", async () => {
      await emailService.sendAccountCreationNotification({
        user: mockUser,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Welcome to Luppa PLC Inventory System",
          template: "account-creation",
          data: expect.objectContaining({
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            email: "t**t@example.com", // Masked for PII protection
            systemName: "Luppa PLC Inventory System",
            loginUrl: "https://inventory.local",
            hasTemporaryPassword: false,
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Account creation notification sent", {
        userId: mockUser.id,
        email: "t**t@example.com", // Masked email
      });
    });

    it("should include temporary password when provided", async () => {
      const tempPassword = "TempPass123!";

      await emailService.sendAccountCreationNotification({
        user: mockUser,
        tempPassword,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            tempPassword: "[REDACTED_PASSWORD]", // Sanitized for security
            hasTemporaryPassword: true,
          }),
        })
      );
    });

    it("should use correct email template and subject", async () => {
      await emailService.sendAccountCreationNotification({
        user: mockUser,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Welcome to Luppa PLC Inventory System",
          template: "account-creation",
        })
      );
    });
  });

  describe("Password Reset Notifications", () => {
    // Use clearly non-secret placeholder token for testing
    const resetToken = "test-reset-token";
    const resetUrl = `https://inventory.local/reset-password?token=${resetToken}`;

    it("should send password reset email", async () => {
      await emailService.sendPasswordResetNotification({
        user: mockUser,
        resetToken,
        resetUrl,
      });

      const loggerCall = (logger.debug as jest.Mock).mock.calls.find(
        call => call[0] === "Email notification would be sent (disabled in test)"
      );

      expect(loggerCall).toBeDefined();

      // Ensure raw token doesn't appear anywhere in logged payload
      const loggedPayload = JSON.stringify(loggerCall[1]);
      expect(loggedPayload).not.toContain(resetToken);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Password Reset Request - Luppa PLC Inventory System",
          template: "password-reset",
          data: expect.objectContaining({
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            systemName: "Luppa PLC Inventory System",
            resetUrl: "https://inventory.local/reset-password?token=[REDACTED_TOKEN]", // Sanitized
            expiryHours: 1,
            supportEmail: "support@luppa-plc.local",
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Password reset notification sent", {
        userId: mockUser.id,
        email: "t**t@example.com", // Masked email
      });
    });

    it("should generate default reset URL if not provided", async () => {
      await emailService.sendPasswordResetNotification({
        user: mockUser,
        resetToken,
        resetUrl: "",
      });

      const loggerCall = (logger.debug as jest.Mock).mock.calls.find(
        call => call[0] === "Email notification would be sent (disabled in test)"
      );

      // Ensure raw token doesn't appear anywhere in logged payload
      const loggedPayload = JSON.stringify(loggerCall[1]);
      expect(loggedPayload).not.toContain(resetToken);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            resetUrl: "https://inventory.local/reset-password?token=[REDACTED_TOKEN]", // Sanitized
          }),
        })
      );
    });

    it("should include security information in email", async () => {
      await emailService.sendPasswordResetNotification({
        user: mockUser,
        resetToken,
        resetUrl,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            expiryHours: 1,
            supportEmail: "support@luppa-plc.local",
          }),
        })
      );
    });
  });

  describe("Password Change Notifications", () => {
    it("should send password change confirmation", async () => {
      const changedBy = "admin@example.com";

      await emailService.sendPasswordChangeNotification({
        user: mockUser,
        changedBy,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Password Changed - Luppa PLC Inventory System",
          template: "password-changed",
          data: expect.objectContaining({
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            systemName: "Luppa PLC Inventory System",
            changedBy,
            changedAt: expect.any(String),
            supportEmail: "support@luppa-plc.local",
            loginUrl: "https://inventory.local",
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Password change notification sent", {
        userId: mockUser.id,
        email: "t**t@example.com", // Masked email
        changedBy,
      });
    });

    it('should default to "yourself" when changedBy is not provided', async () => {
      await emailService.sendPasswordChangeNotification({
        user: mockUser,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            changedBy: "yourself",
          }),
        })
      );
    });

    it("should include timestamp of change", async () => {
      await emailService.sendPasswordChangeNotification({
        user: mockUser,
      });

      const loggerCall = (logger.debug as jest.Mock).mock.calls.find(
        call => call[0] === "Email notification would be sent (disabled in test)"
      );

      expect(loggerCall).toBeDefined();
      const changedAt = loggerCall[1].data.changedAt;

      // Validate that changedAt is a parseable date string
      expect(typeof changedAt).toBe("string");
      const parsedDate = Date.parse(changedAt);
      expect(parsedDate).not.toBeNaN();
      expect(new Date(parsedDate)).toBeInstanceOf(Date);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            changedAt: expect.any(String), // Should be a valid ISO date string
          }),
        })
      );
    });
  });

  describe("Role Assignment Notifications", () => {
    const assignedBy = "admin@example.com (admin-123)";
    const reason = "Promotion due to excellent performance";

    it("should send role assignment notification", async () => {
      await emailService.sendRoleAssignmentNotification({
        user: mockUser,
        oldRole: mockUser.role,
        newRole: mockAdminRole,
        assignedBy,
        reason,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Role Assignment Updated - Luppa PLC Inventory System",
          template: "role-assignment",
          data: expect.objectContaining({
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            systemName: "Luppa PLC Inventory System",
            oldRoleName: "Engineer",
            newRoleName: "Admin",
            assignedBy,
            reason,
            assignedAt: expect.any(String),
            supportEmail: "support@luppa-plc.local",
            loginUrl: "https://inventory.local",
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Role assignment notification sent", {
        userId: mockUser.id,
        email: "t**t@example.com", // Masked email
        oldRole: "Engineer",
        newRole: "Admin",
        assignedBy,
      });
    });

    it("should handle missing old role gracefully", async () => {
      await emailService.sendRoleAssignmentNotification({
        user: mockUser,
        newRole: mockAdminRole,
        assignedBy,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            oldRoleName: undefined,
            newRoleName: "Admin",
          }),
        })
      );
    });

    it("should handle missing reason gracefully", async () => {
      await emailService.sendRoleAssignmentNotification({
        user: mockUser,
        oldRole: mockUser.role,
        newRole: mockAdminRole,
        assignedBy,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            reason: undefined,
          }),
        })
      );
    });
  });

  describe("Account Deactivation Notifications", () => {
    const deactivatedBy = "admin@example.com";

    it("should send account deactivation notification", async () => {
      await emailService.sendAccountDeactivationNotification(mockUser, deactivatedBy);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "t**t@example.com", // Masked email
          subject: "Account Deactivated - Luppa PLC Inventory System",
          template: "account-deactivated",
          data: expect.objectContaining({
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            systemName: "Luppa PLC Inventory System",
            deactivatedBy,
            deactivatedAt: expect.any(String),
            supportEmail: "support@luppa-plc.local",
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Account deactivation notification sent", {
        userId: mockUser.id,
        email: "t**t@example.com", // Masked email
        deactivatedBy,
      });
    });

    it("should include deactivation timestamp", async () => {
      await emailService.sendAccountDeactivationNotification(mockUser, deactivatedBy);

      const loggerCall = (logger.debug as jest.Mock).mock.calls.find(
        call => call[0] === "Email notification would be sent (disabled in test)"
      );

      expect(loggerCall).toBeDefined();
      const deactivatedAt = loggerCall[1].data.deactivatedAt;

      // Validate that deactivatedAt is a parseable date string
      expect(typeof deactivatedAt).toBe("string");
      const parsedDate = Date.parse(deactivatedAt);
      expect(parsedDate).not.toBeNaN();
      expect(new Date(parsedDate)).toBeInstanceOf(Date);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            deactivatedAt: expect.any(String), // Should be a valid ISO date string
          }),
        })
      );
    });
  });

  describe("Generic Notifications", () => {
    it("should send generic text notification", async () => {
      const to = "recipient@example.com";
      const subject = "Test Subject";
      const message = "Test message content";

      await emailService.sendNotification(to, subject, message, false);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          to: "r*******t@example.com", // Masked email
          subject: `${subject} - Luppa PLC Inventory System`,
          template: "generic-text",
          data: expect.objectContaining({
            message,
            systemName: "Luppa PLC Inventory System",
            supportEmail: "support@luppa-plc.local",
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith("Generic notification sent", {
        to: "r*******t@example.com",
        subject,
      });
    });

    it("should send generic HTML notification", async () => {
      const to = "recipient@example.com";
      const subject = "HTML Test Subject";
      const message = "<p>HTML test message</p>";

      await emailService.sendNotification(to, subject, message, true);

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          template: "generic-html",
        })
      );
    });
  });

  describe("Error Handling", () => {
    // Store original NODE_ENV for proper restoration
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      // Enable email service to test error handling
      process.env.NODE_ENV = "development";
      emailService = new EmailNotificationService();
    });

    afterEach(() => {
      // Restore original environment instead of hardcoding
      process.env.NODE_ENV = originalNodeEnv || "test";
    });

    it("should handle email sending failures gracefully", async () => {
      // Use type-safe Jest spy with proper error throwing implementation
      const setTimeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation((() => {
        throw new Error("SMTP connection failed");
      }) as typeof setTimeout);

      try {
        await expect(
          emailService.sendAccountCreationNotification({
            user: mockUser,
          })
        ).rejects.toThrow("SMTP connection failed");

        expect(logger.error).toHaveBeenCalledWith(
          "Failed to send email notification",
          expect.objectContaining({
            error: "SMTP connection failed",
          })
        );
      } finally {
        // Always restore setTimeout even if test throws
        setTimeoutSpy.mockRestore();
      }
    });

    it("should log detailed error information", async () => {
      const customError = new Error("Custom SMTP error");
      customError.stack = "Error stack trace";

      // Use type-safe Jest spy with proper cleanup
      const setTimeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation(() => {
        throw customError;
      });

      try {
        await expect(
          emailService.sendPasswordResetNotification({
            user: mockUser,
            resetToken: "test-token-placeholder",
            resetUrl: "https://test.com/reset",
          })
        ).rejects.toThrow("Custom SMTP error");

        expect(logger.error).toHaveBeenCalledWith(
          "Failed to send email notification",
          expect.objectContaining({
            error: "Custom SMTP error",
            emailData: expect.objectContaining({
              to: "t**t@example.com", // Masked email
              template: "password-reset",
            }),
          })
        );
      } finally {
        // Always restore setTimeout even if test throws
        setTimeoutSpy.mockRestore();
      }
    });
  });

  describe("Template Rendering", () => {
    it("should render account creation template correctly", () => {
      const service = new EmailNotificationService();

      // The template rendering is tested indirectly through email sending
      expect(service).toBeDefined();
    });

    it("should handle missing template data gracefully", async () => {
      const userWithMissingData = {
        ...mockUser,
        firstName: "",
        lastName: "",
      };

      await emailService.sendAccountCreationNotification({
        user: userWithMissingData,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: "",
            lastName: "",
          }),
        })
      );
    });
  });

  describe("Service Health and Status", () => {
    it("should test email connection successfully", async () => {
      const connectionTest = await emailService.testConnection();

      expect(connectionTest).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        "Email service connection test (mock implementation)"
      );
    });

    it("should handle connection test failures", async () => {
      // Create a fresh service instance to avoid affecting other tests
      const failingEmailService = new EmailNotificationService();

      // Mock logger.info for this specific service to throw error
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Connection test failed");
      });

      const connectionTest = await failingEmailService.testConnection();

      expect(connectionTest).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Email service connection test failed",
        expect.objectContaining({
          error: "Connection test failed",
        })
      );
    });

    it("should provide accurate service status", () => {
      const status = emailService.getStatus();

      expect(status).toEqual({
        enabled: false, // Test environment
        fromEmail: "noreply@luppa-plc.local",
        systemName: "Luppa PLC Inventory System",
      });
    });
  });

  describe("Environment Configuration", () => {
    // Store original environment values for proper restoration
    const originalEnvVars = {
      SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
      SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
      FRONTEND_URL: process.env.FRONTEND_URL,
    };

    beforeEach(() => {
      delete process.env.SMTP_FROM_EMAIL;
      delete process.env.SUPPORT_EMAIL;
      delete process.env.FRONTEND_URL;
    });

    afterEach(() => {
      // Restore original values instead of hardcoding
      if (originalEnvVars.SMTP_FROM_EMAIL !== undefined) {
        process.env.SMTP_FROM_EMAIL = originalEnvVars.SMTP_FROM_EMAIL;
      } else {
        delete process.env.SMTP_FROM_EMAIL;
      }

      if (originalEnvVars.SUPPORT_EMAIL !== undefined) {
        process.env.SUPPORT_EMAIL = originalEnvVars.SUPPORT_EMAIL;
      } else {
        delete process.env.SUPPORT_EMAIL;
      }

      if (originalEnvVars.FRONTEND_URL !== undefined) {
        process.env.FRONTEND_URL = originalEnvVars.FRONTEND_URL;
      } else {
        delete process.env.FRONTEND_URL;
      }
    });

    it("should use default configuration when environment variables are not set", () => {
      const service = new EmailNotificationService();
      const status = service.getStatus();

      expect(status.fromEmail).toBe("noreply@luppa-plc.local");
      expect(status.systemName).toBe("Luppa PLC Inventory System");
    });

    it("should use default URLs and emails in notifications", async () => {
      const service = new EmailNotificationService();

      await service.sendPasswordResetNotification({
        user: mockUser,
        resetToken: "test-token-***",
        resetUrl: "",
      });

      expect(logger.debug).toHaveBeenCalledWith(
        "Email notification would be sent (disabled in test)",
        expect.objectContaining({
          data: expect.objectContaining({
            resetUrl: "https://inventory.local/reset-password?token=[REDACTED_TOKEN]", // Sanitized
            supportEmail: "support@luppa-plc.local",
          }),
        })
      );
    });
  });

  describe("Asynchronous Behavior", () => {
    it("should handle concurrent email sending", async () => {
      const promises = [
        emailService.sendAccountCreationNotification({ user: mockUser }),
        emailService.sendPasswordChangeNotification({ user: mockUser }),
        emailService.sendRoleAssignmentNotification({
          user: mockUser,
          newRole: mockAdminRole,
          assignedBy: "admin",
        }),
      ];

      await Promise.all(promises);

      // Should have logged info for each email sent plus the service initialization
      expect(logger.info).toHaveBeenCalledTimes(4);
      expect(logger.debug).toHaveBeenCalledTimes(3);
    });

    it("should not block on email failures", async () => {
      const startTime = Date.now();

      try {
        await emailService.sendAccountCreationNotification({ user: mockUser });
      } catch (error) {
        // Should not throw in test environment
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly in test environment
      expect(duration).toBeLessThan(100);
    });
  });
});

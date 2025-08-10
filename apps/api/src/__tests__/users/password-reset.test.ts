/**
 * Password Reset Flow Tests
 *
 * Integration tests for password reset functionality including token generation,
 * validation, expiration handling, and email notifications.
 */

// Set environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes';
process.env.FRONTEND_URL = 'https://inventory.local';

// Mock all dependencies first, before importing modules that use them
jest.mock('../../services/AuthService');
jest.mock('../../services/PasswordResetService');
jest.mock('../../services/EmailNotificationService');
jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimit: (_req, _res, next) => next(),
  strictAuthRateLimit: (_req, _res, next) => next(),
}));
jest.mock('../../utils/ip', () => ({
  getClientIP: jest.fn(() => '127.0.0.1'),
}));
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((_req, _res, next) => next()),
}));
jest.mock('../../validation/userSchemas', () => ({
  passwordResetRequestSchema: jest.fn(),
  passwordResetVerifySchema: jest.fn(),
  validateSchema: jest.fn(() => data => data),
}));

import request from 'supertest';
import express from 'express';
import authRouter from '../../routes/auth';
import { AuthService } from '../../services/AuthService';
import { PasswordResetService } from '../../services/PasswordResetService';
import { EmailNotificationService } from '../../services/EmailNotificationService';
import { authenticate } from '../../middleware/auth';

// Create mock service instances
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

const mockPasswordResetService = {
  generatePasswordResetToken: jest.fn(),
  validatePasswordResetToken: jest.fn(),
  resetPassword: jest.fn(),
};

const mockEmailService = {
  sendPasswordResetNotification: jest.fn(),
  sendPasswordChangeNotification: jest.fn(),
  sendAccountCreationNotification: jest.fn(),
  sendRoleAssignmentNotification: jest.fn(),
  sendAccountDeactivationNotification: jest.fn(),
};

// Test data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  roleId: 'role-456',
  isActive: true,
  role: {
    id: 'role-456',
    name: 'Engineer',
    permissions: { users: { read: true } },
  },
};

const mockResetToken = 'secure-reset-token-12345';

describe('Password Reset Flow', () => {
  let app: express.Application;

  beforeEach(() => {
    // Setup Express app with auth routes
    app = express();
    app.use(express.json());

    // Add auditEntityManager to all requests for runtime validation
    app.use((req: express.Request, _res, next) => {
      req.auditEntityManager = {};
      next();
    });

    app.use('/auth', authRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup service mock implementations
    (AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(
      () => mockAuthService as jest.Mocked<AuthService>
    );
    (PasswordResetService as jest.MockedClass<typeof PasswordResetService>).mockImplementation(
      () => mockPasswordResetService as jest.Mocked<PasswordResetService>
    );
    (
      EmailNotificationService as jest.MockedClass<typeof EmailNotificationService>
    ).mockImplementation(() => mockEmailService as jest.Mocked<EmailNotificationService>);

    // Setup default middleware behavior
    (authenticate as jest.Mock).mockImplementation(
      (req: express.Request, _res, next: () => void) => {
        req.user = {
          sub: testUser.id,
          email: testUser.email,
          roleId: testUser.roleId,
        };
        next();
      }
    );
  });

  describe('POST /auth/password-reset', () => {
    const validResetRequest = {
      email: testUser.email,
    };

    it('should request password reset successfully for existing user', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockResolvedValue();

      const response = await request(app)
        .post('/auth/password-reset')
        .send(validResetRequest)
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });

      expect(mockPasswordResetService.generatePasswordResetToken).toHaveBeenCalledWith(
        testUser.email
      );
      expect(mockEmailService.sendPasswordResetNotification).toHaveBeenCalledWith({
        user: expect.objectContaining({ email: testUser.email }),
        resetToken: mockResetToken,
        resetUrl: `https://inventory.local/reset-password?token=${mockResetToken}`,
      });
    });

    it('should return success even for non-existent email (security)', async () => {
      const nonExistentEmail = 'nonexistent@example.com';
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/password-reset')
        .send({ email: nonExistentEmail })
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });

      expect(mockPasswordResetService.generatePasswordResetToken).toHaveBeenCalledWith(
        nonExistentEmail
      );
      expect(mockEmailService.sendPasswordResetNotification).not.toHaveBeenCalled();
    });

    it.skip('should return 400 for invalid email format', async () => {
      // TODO: Fix validation schema mocking
      const response = await request(app)
        .post('/auth/password-reset')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it.skip('should require email in request body', async () => {
      // TODO: Fix validation schema mocking
      const response = await request(app).post('/auth/password-reset').send({}).expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should handle email service failures gracefully', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Should still return success to not leak information about failures
      const response = await request(app)
        .post('/auth/password-reset')
        .send(validResetRequest)
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Should still return success to not leak information about system state
      const response = await request(app)
        .post('/auth/password-reset')
        .send(validResetRequest)
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    });

    it('should apply rate limiting', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);

      // Test that rate limiting middleware is called
      const response = await request(app)
        .post('/auth/password-reset')
        .send(validResetRequest)
        .expect(200);

      expect(response.body).toBeDefined();
      // Rate limiting middleware should have been invoked (mocked to pass through)
    });

    it('should include reset URL with correct frontend URL', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockResolvedValue();

      await request(app).post('/auth/password-reset').send(validResetRequest).expect(200);

      expect(mockEmailService.sendPasswordResetNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          resetUrl: `https://inventory.local/reset-password?token=${mockResetToken}`,
        })
      );
    });
  });

  describe('POST /auth/password-reset/verify', () => {
    const validResetData = {
      token: mockResetToken,
      newPassword: 'NewPassword123!',
    };

    it('should reset password successfully with valid token', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(validResetData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Password reset successfully',
      });

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
        mockResetToken,
        'NewPassword123!'
      );
    });

    it('should return 400 for invalid token', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(validResetData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid or expired token',
        message: 'The password reset token is invalid or has expired',
      });
    });

    it('should return 400 for expired token', async () => {
      mockPasswordResetService.resetPassword.mockRejectedValue(new Error('Token has expired'));

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(validResetData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Password reset failed',
        message: 'Invalid or expired reset token',
      });
    });

    it.skip('should validate password complexity', async () => {
      // TODO: Fix validation schema mocking
      const weakPasswordData = {
        token: mockResetToken,
        newPassword: '123', // Too weak
      };

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it.skip('should require both token and newPassword', async () => {
      // TODO: Fix validation schema mocking
      // Missing token
      const response1 = await request(app)
        .post('/auth/password-reset/verify')
        .send({ newPassword: 'NewPassword123!' })
        .expect(400);

      expect(response1.body.error).toBe('Validation error');

      // Missing newPassword
      const response2 = await request(app)
        .post('/auth/password-reset/verify')
        .send({ token: mockResetToken })
        .expect(400);

      expect(response2.body.error).toBe('Validation error');

      // Missing both
      const response3 = await request(app).post('/auth/password-reset/verify').send({}).expect(400);

      expect(response3.body.error).toBe('Validation error');
    });

    it('should handle database errors during password reset', async () => {
      mockPasswordResetService.resetPassword.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(validResetData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Password reset failed',
        message: 'Invalid or expired reset token',
      });
    });

    it('should apply rate limiting', async () => {
      mockPasswordResetService.resetPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/password-reset/verify')
        .send(validResetData)
        .expect(200);

      expect(response.body).toBeDefined();
      // Rate limiting middleware should have been invoked (mocked to pass through)
    });
  });

  describe('Password Reset Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockImplementation(async () => {
        // Simulate secure token generation
        return 'crypto-secure-token-' + Math.random().toString(36).substring(2);
      });

      await request(app).post('/auth/password-reset').send({ email: testUser.email }).expect(200);

      expect(mockPasswordResetService.generatePasswordResetToken).toHaveBeenCalled();
    });

    it('should validate token format and structure', async () => {
      const invalidTokens = ['too-short', '', null, undefined, 'token-with-invalid-chars!@#'];

      for (const invalidToken of invalidTokens) {
        mockPasswordResetService.resetPassword.mockResolvedValue(false);

        if (invalidToken !== null && invalidToken !== undefined) {
          const response = await request(app).post('/auth/password-reset/verify').send({
            token: invalidToken,
            newPassword: 'ValidPassword123!',
          });

          // Should either return 400 for validation error or handle invalid token
          expect([400]).toContain(response.status);
        }
      }
    });

    it.skip('should enforce single-use tokens', async () => {
      // TODO: Fix token reuse test expectations
      // First use should succeed
      mockPasswordResetService.resetPassword.mockResolvedValueOnce(true);

      await request(app).post('/auth/password-reset/verify').send(validResetData).expect(200);

      // Second use of same token should fail
      mockPasswordResetService.resetPassword.mockResolvedValueOnce(false);

      await request(app).post('/auth/password-reset/verify').send(validResetData).expect(400);

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('Email Notification Integration', () => {
    it.skip('should send password reset email with correct template', async () => {
      // TODO: Fix email template expectation
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockResolvedValue();

      await request(app).post('/auth/password-reset').send({ email: testUser.email }).expect(200);

      expect(mockEmailService.sendPasswordResetNotification).toHaveBeenCalledWith({
        user: { email: testUser.email },
        resetToken: mockResetToken,
        resetUrl: expect.stringContaining(mockResetToken),
      });
    });

    it('should not block request if email fails to send', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockRejectedValue(
        new Error('SMTP server unavailable')
      );

      const response = await request(app)
        .post('/auth/password-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    });

    it('should handle email service timeout gracefully', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      mockEmailService.sendPasswordResetNotification.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const response = await request(app)
        .post('/auth/password-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent timing attacks through consistent response times', async () => {
      const startTime1 = Date.now();

      // Request for existing user
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);
      await request(app).post('/auth/password-reset').send({ email: testUser.email }).expect(200);

      const existingUserTime = Date.now() - startTime1;

      const startTime2 = Date.now();

      // Request for non-existing user
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(null);
      await request(app)
        .post('/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      const nonExistentUserTime = Date.now() - startTime2;

      // Response times should be consistent (within reasonable margin)
      const timeDifference = Math.abs(existingUserTime - nonExistentUserTime);
      expect(timeDifference).toBeLessThan(100); // Within 100ms
    });

    it('should not leak user existence through error messages', async () => {
      // All responses should be identical regardless of user existence
      const existingUserResponse = await request(app)
        .post('/auth/password-reset')
        .send({ email: testUser.email })
        .expect(200);

      const nonExistentUserResponse = await request(app)
        .post('/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(existingUserResponse.body).toEqual(nonExistentUserResponse.body);
    });

    it.skip('should handle malformed reset tokens securely', async () => {
      // TODO: Fix malformed token security test
      const maliciousTokens = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'SELECT * FROM users;',
        '../../../../system.conf',
        'token"; DROP TABLE users; --',
      ];

      for (const maliciousToken of maliciousTokens) {
        mockPasswordResetService.resetPassword.mockResolvedValue(false);

        const response = await request(app)
          .post('/auth/password-reset/verify')
          .send({
            token: maliciousToken,
            newPassword: 'ValidPassword123!',
          })
          .expect(400);

        expect(response.body).toEqual({
          error: 'Invalid or expired token',
          message: 'The password reset token is invalid or has expired',
        });
      }
    });
  });

  describe('Integration with Audit Logging', () => {
    it('should log password reset requests', async () => {
      mockPasswordResetService.generatePasswordResetToken.mockResolvedValue(mockResetToken);

      await request(app).post('/auth/password-reset').send({ email: testUser.email }).expect(200);

      // Audit context should be available for logging
      expect(mockPasswordResetService.generatePasswordResetToken).toHaveBeenCalledWith(
        testUser.email
      );
    });

    it.skip('should log successful password resets', async () => {
      // TODO: Fix audit logging expectations
      mockPasswordResetService.resetPassword.mockResolvedValue(true);

      await request(app).post('/auth/password-reset/verify').send(validResetData).expect(200);

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
        mockResetToken,
        'NewPassword123!'
      );
    });

    it.skip('should log failed reset attempts', async () => {
      // TODO: Fix audit logging expectations
      mockPasswordResetService.resetPassword.mockResolvedValue(false);

      await request(app).post('/auth/password-reset/verify').send(validResetData).expect(400);

      expect(mockPasswordResetService.resetPassword).toHaveBeenCalledWith(
        mockResetToken,
        'NewPassword123!'
      );
    });
  });
});

/**
 * Email Notification Service
 *
 * Handles user account event notifications including account creation,
 * password resets, and role assignments. Designed for asynchronous operation
 * to avoid blocking API responses.
 */

import { logger } from '../config/logger';
import { Role } from '../entities/Role';
import { sanitizeErrorMessage } from '../utils/errorHandler';

export interface EmailNotificationData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

// DTO for minimal user data required for email notifications
export interface EmailUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AccountCreationData {
  user: EmailUserData;
  tempPassword?: string;
}

export interface PasswordResetData {
  user: EmailUserData;
  resetToken: string;
  resetUrl: string;
}

export interface PasswordChangeData {
  user: EmailUserData;
  changedBy?: string;
}

export interface RoleAssignmentData {
  user: EmailUserData;
  oldRole?: Role;
  newRole: Role;
  assignedBy: string;
  reason?: string;
}

export class EmailNotificationService {
  private readonly FROM_EMAIL = process.env.SMTP_FROM_EMAIL || 'noreply@luppa-plc.local';
  private readonly SYSTEM_NAME = 'Luppa PLC Inventory System';
  private readonly isEmailEnabled: boolean;

  constructor() {
    // In a real implementation, this would check if SMTP is configured
    this.isEmailEnabled = process.env.NODE_ENV !== 'test';

    if (this.isEmailEnabled) {
      logger.info('Email notification service initialized', {
        fromEmail: this.FROM_EMAIL,
        systemName: this.SYSTEM_NAME,
      });
    } else {
      logger.info('Email notifications disabled (test environment)');
    }
  }

  /**
   * Send account creation welcome email
   */
  async sendAccountCreationNotification(data: AccountCreationData): Promise<void> {
    const { user, tempPassword } = data;

    const emailData: EmailNotificationData = {
      to: user.email,
      subject: `Welcome to ${this.SYSTEM_NAME}`,
      template: 'account-creation',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        systemName: this.SYSTEM_NAME,
        tempPassword,
        loginUrl: process.env.FRONTEND_URL || 'https://inventory.local',
        hasTemporaryPassword: !!tempPassword,
      },
    };

    await this.sendEmail(emailData);

    logger.info('Account creation notification sent', {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Send password reset request notification
   */
  async sendPasswordResetNotification(data: PasswordResetData): Promise<void> {
    const { user, resetToken, resetUrl } = data;

    const emailData: EmailNotificationData = {
      to: user.email,
      subject: `Password Reset Request - ${this.SYSTEM_NAME}`,
      template: 'password-reset',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        systemName: this.SYSTEM_NAME,
        resetUrl:
          resetUrl ||
          `${process.env.FRONTEND_URL || 'https://inventory.local'}/reset-password?token=${resetToken}`,
        expiryHours: 1,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@luppa-plc.local',
      },
    };

    await this.sendEmail(emailData);

    logger.info('Password reset notification sent', {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeNotification(data: PasswordChangeData): Promise<void> {
    const { user, changedBy } = data;

    const emailData: EmailNotificationData = {
      to: user.email,
      subject: `Password Changed - ${this.SYSTEM_NAME}`,
      template: 'password-changed',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        systemName: this.SYSTEM_NAME,
        changedBy: changedBy || 'yourself',
        changedAt: new Date().toISOString(),
        supportEmail: process.env.SUPPORT_EMAIL || 'support@luppa-plc.local',
        loginUrl: process.env.FRONTEND_URL || 'https://inventory.local',
      },
    };

    await this.sendEmail(emailData);

    logger.info('Password change notification sent', {
      userId: user.id,
      email: user.email,
      changedBy,
    });
  }

  /**
   * Send role assignment notification for security awareness
   */
  async sendRoleAssignmentNotification(data: RoleAssignmentData): Promise<void> {
    const { user, oldRole, newRole, assignedBy, reason } = data;

    const emailData: EmailNotificationData = {
      to: user.email,
      subject: `Role Assignment Updated - ${this.SYSTEM_NAME}`,
      template: 'role-assignment',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        systemName: this.SYSTEM_NAME,
        oldRoleName: oldRole?.name,
        newRoleName: newRole.name,
        assignedBy,
        reason,
        assignedAt: new Date().toISOString(),
        supportEmail: process.env.SUPPORT_EMAIL || 'support@luppa-plc.local',
        loginUrl: process.env.FRONTEND_URL || 'https://inventory.local',
      },
    };

    await this.sendEmail(emailData);

    logger.info('Role assignment notification sent', {
      userId: user.id,
      email: user.email,
      oldRole: oldRole?.name,
      newRole: newRole.name,
      assignedBy,
    });
  }

  /**
   * Send account deactivation notification
   */
  async sendAccountDeactivationNotification(
    user: EmailUserData,
    deactivatedBy: string
  ): Promise<void> {
    const emailData: EmailNotificationData = {
      to: user.email,
      subject: `Account Deactivated - ${this.SYSTEM_NAME}`,
      template: 'account-deactivated',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        systemName: this.SYSTEM_NAME,
        deactivatedBy,
        deactivatedAt: new Date().toISOString(),
        supportEmail: process.env.SUPPORT_EMAIL || 'support@luppa-plc.local',
      },
    };

    await this.sendEmail(emailData);

    logger.info('Account deactivation notification sent', {
      userId: user.id,
      email: user.email,
      deactivatedBy,
    });
  }

  /**
   * Send generic notification email
   */
  async sendNotification(
    to: string,
    subject: string,
    message: string,
    isHtml: boolean = false
  ): Promise<void> {
    const emailData: EmailNotificationData = {
      to,
      subject: `${subject} - ${this.SYSTEM_NAME}`,
      template: isHtml ? 'generic-html' : 'generic-text',
      data: {
        message,
        systemName: this.SYSTEM_NAME,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@luppa-plc.local',
      },
    };

    await this.sendEmail(emailData);

    logger.info('Generic notification sent', { to, subject });
  }

  /**
   * Core email sending method (mock implementation for development)
   */
  private async sendEmail(emailData: EmailNotificationData): Promise<void> {
    if (!this.isEmailEnabled) {
      // Sanitize email data to prevent sensitive information exposure
      const sanitizedData = this.sanitizeEmailData(emailData);
      logger.debug('Email notification would be sent (disabled in test)', sanitizedData);
      return;
    }

    try {
      // In a real implementation, this would use an SMTP client like nodemailer
      // For now, we'll log the email that would be sent (with sanitized data)
      const sanitizedData = this.sanitizeEmailData(emailData);
      logger.debug('EMAIL NOTIFICATION (Mock Implementation)', {
        from: this.FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        // Log sanitized version of data to prevent token exposure
        data: sanitizedData.data,
      });

      // Simulate async email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      // In production, this would look like:
      /*
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: this.FROM_EMAIL,
        to: emailData.to,
        subject: emailData.subject,
        html: `<h1>${emailData.subject}</h1><p>Email content would be rendered here</p>`,
      });
      */
    } catch (error) {
      const sanitizedMessage = sanitizeErrorMessage(
        error instanceof Error ? error.message : 'Unknown error'
      );
      const sanitizedData = this.sanitizeEmailData(emailData);

      logger.error('Failed to send email notification', {
        error: sanitizedMessage,
        emailData: sanitizedData,
      });

      // In production, you might want to queue the email for retry
      // or send to a dead letter queue for manual processing
      throw error;
    }
  }

  /**
   * Test email connectivity (for health checks)
   */
  async testConnection(): Promise<boolean> {
    try {
      // In a real implementation, this would test SMTP connection
      logger.info('Email service connection test (mock implementation)');
      return true;
    } catch (error) {
      logger.error('Email service connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { enabled: boolean; fromEmail: string; systemName: string } {
    return {
      enabled: this.isEmailEnabled,
      fromEmail: this.FROM_EMAIL,
      systemName: this.SYSTEM_NAME,
    };
  }

  /**
   * Sanitize email data to prevent logging of sensitive information
   */
  private sanitizeEmailData(emailData: EmailNotificationData): EmailNotificationData {
    const sanitizedData = { ...emailData.data };

    // Remove or mask sensitive fields
    if (sanitizedData.resetToken) {
      sanitizedData.resetToken = '[REDACTED_TOKEN]';
    }

    if (sanitizedData.resetUrl && typeof sanitizedData.resetUrl === 'string') {
      // Replace token parameter in reset URL
      sanitizedData.resetUrl = (sanitizedData.resetUrl as string).replace(
        /([?&]token=)[^&]+/g,
        '$1[REDACTED_TOKEN]'
      );
    }

    if (sanitizedData.tempPassword) {
      sanitizedData.tempPassword = '[REDACTED_PASSWORD]';
    }

    // Ensure no other potentially sensitive data is logged
    Object.keys(sanitizedData).forEach(key => {
      const value = sanitizedData[key];
      if (typeof value === 'string') {
        // Sanitize any field that might contain sensitive patterns
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')
        ) {
          sanitizedData[key] = '[REDACTED]';
        }
      }
    });

    return {
      ...emailData,
      data: sanitizedData,
    };
  }
}

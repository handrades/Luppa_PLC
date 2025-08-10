/**
 * Password Reset Service
 *
 * Secure token management for password reset functionality.
 * Uses cryptographically secure tokens stored in Redis with TTL expiration.
 */

import { randomBytes } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { redisClient } from '../config/redis';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from './AuthService';
import { logger } from '../config/logger';

export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
}

export class PasswordResetService {
  private userRepository: UserRepository;
  private authService: AuthService;
  private readonly TOKEN_PREFIX = 'password_reset:';
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_TTL_HOURS = 1;
  private readonly TOKEN_TTL_SECONDS = this.TOKEN_TTL_HOURS * 60 * 60;

  constructor(entityManager?: EntityManager) {
    this.userRepository = new UserRepository();
    this.authService = new AuthService(entityManager);
  }

  /**
   * Generate secure password reset token for user
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email (don't reveal if email exists or not for security)
    const user = await this.userRepository.findByEmailWithRole(normalizedEmail);

    if (!user || !user.isActive) {
      logger.warn('Password reset requested for non-existent or inactive user', {
        email: normalizedEmail,
      });
      // Return a dummy token to prevent email enumeration attacks
      return this.generateSecureToken();
    }

    // Generate cryptographically secure token
    const token = this.generateSecureToken();
    const tokenKey = `${this.TOKEN_PREFIX}${token}`;

    // Store token data in Redis with TTL
    const tokenData: PasswordResetToken = {
      token,
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + this.TOKEN_TTL_HOURS * 60 * 60 * 1000),
    };

    try {
      await redisClient.setEx(tokenKey, this.TOKEN_TTL_SECONDS, JSON.stringify(tokenData));

      // Also store by user ID to prevent multiple concurrent tokens
      const userTokenKey = `${this.TOKEN_PREFIX}user:${user.id}`;
      await redisClient.setEx(userTokenKey, this.TOKEN_TTL_SECONDS, token);

      logger.info('Password reset token generated', {
        userId: user.id,
        email: user.email,
        expiresAt: tokenData.expiresAt,
      });

      return token;
    } catch (error) {
      logger.error('Failed to store password reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      });
      throw new Error('Failed to generate password reset token');
    }
  }

  /**
   * Validate password reset token and return token data
   */
  async validatePasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    if (!token || token.length !== this.TOKEN_LENGTH * 2) {
      // hex string is 2x the byte length
      return null;
    }

    const tokenKey = `${this.TOKEN_PREFIX}${token}`;

    try {
      const tokenDataJson = await redisClient.get(tokenKey);

      if (!tokenDataJson) {
        logger.warn('Password reset token not found or expired', { token });
        return null;
      }

      const tokenData: PasswordResetToken = JSON.parse(tokenDataJson);

      // Verify token hasn't expired (double-check even though Redis TTL should handle this)
      if (new Date() > new Date(tokenData.expiresAt)) {
        logger.warn('Password reset token expired', { token, expiresAt: tokenData.expiresAt });
        await this.invalidateToken(token);
        return null;
      }

      return tokenData;
    } catch (error) {
      logger.error('Failed to validate password reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      });
      return null;
    }
  }

  /**
   * Reset user password using valid token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenData = await this.validatePasswordResetToken(token);

    if (!tokenData) {
      return false;
    }

    try {
      // Find user to ensure they still exist and are active
      const user = await this.userRepository.findWithRole(tokenData.userId);

      if (!user || !user.isActive) {
        logger.warn('Password reset attempted for non-existent or inactive user', {
          userId: tokenData.userId,
        });
        await this.invalidateToken(token);
        return false;
      }

      // Hash new password
      const hashedPassword = await this.authService.hashPassword(newPassword);

      // Update user password
      await this.userRepository.updateUser(user.id, {
        passwordHash: hashedPassword,
      });

      // Invalidate the token (single use)
      await this.invalidateToken(token);

      // Invalidate any other tokens for this user
      await this.invalidateUserTokens(user.id);

      logger.info('Password successfully reset', {
        userId: user.id,
        email: user.email,
      });

      return true;
    } catch (error) {
      logger.error('Failed to reset password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: tokenData.userId,
      });
      return false;
    }
  }

  /**
   * Invalidate a specific password reset token
   */
  async invalidateToken(token: string): Promise<void> {
    const tokenKey = `${this.TOKEN_PREFIX}${token}`;

    try {
      await redisClient.del(tokenKey);
      logger.info('Password reset token invalidated', { token });
    } catch (error) {
      logger.error('Failed to invalidate password reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      });
    }
  }

  /**
   * Invalidate all password reset tokens for a user
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    const userTokenKey = `${this.TOKEN_PREFIX}user:${userId}`;

    try {
      // Get the current token for this user
      const currentToken = await redisClient.get(userTokenKey);

      if (currentToken) {
        await this.invalidateToken(currentToken);
      }

      // Remove the user token mapping
      await redisClient.del(userTokenKey);

      logger.info('All password reset tokens invalidated for user', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user password reset tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }

  /**
   * Check if user has active password reset token
   */
  async hasActiveToken(userId: string): Promise<boolean> {
    const userTokenKey = `${this.TOKEN_PREFIX}user:${userId}`;

    try {
      const token = await redisClient.get(userTokenKey);
      return !!token;
    } catch (error) {
      logger.error('Failed to check for active password reset token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      return false;
    }
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Clean up expired tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<void> {
    // Redis TTL handles automatic cleanup, but this method can be used
    // for manual cleanup or monitoring purposes
    logger.info('Password reset token cleanup completed (handled by Redis TTL)');
  }
}

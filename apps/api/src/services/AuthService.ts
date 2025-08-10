/**
 * Authentication Service
 *
 * Handles user authentication, JWT token generation/validation,
 * and session management with Redis.
 */

import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { JwtPayload, TokenType, jwtConfig, validateJwtConfig } from '../config/jwt';
import {
  SessionData,
  blacklistToken,
  getSession,
  isTokenBlacklisted,
  removeSession,
  storeSession,
  updateSessionActivity,
} from '../config/redis';
import { User } from '../entities/User';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  permissions: Record<string, unknown>;
  isActive: boolean;
  lastLogin: Date | null;
}

export interface LoginResult {
  tokens: AuthTokens;
  user: UserProfile;
}

export class AuthService {
  private userRepository: Repository<User>;
  private manager: EntityManager;

  constructor(entityManager?: EntityManager) {
    validateJwtConfig();
    this.manager = entityManager || AppDataSource.manager;
    this.userRepository = this.manager.getRepository(User);
  }

  /**
   * Authenticate user with email and password
   */
  async login(
    credentials: LoginCredentials,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    const { email, password } = credentials;

    // Find user with role information
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      relations: ['role'],
    });

    // Verify user exists and is active
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Update last login timestamp
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // Create user profile
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    return {
      tokens,
      user: userProfile,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: User, ipAddress: string, userAgent: string): Promise<AuthTokens> {
    const tokenId = `${user.id}_${randomUUID()}`;

    // Create JWT payload (without registered claims)
    const payload: Omit<JwtPayload, 'type' | 'iat' | 'exp' | 'iss' | 'aud'> = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: user.role?.permissions || {},
    };

    // Generate access token with registered claims in options
    const accessToken = jwt.sign(
      { ...payload, type: TokenType.ACCESS, jti: `${tokenId}_access` },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.expiresIn,
        algorithm: jwtConfig.algorithm,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );

    // Generate refresh token with registered claims in options
    const refreshToken = jwt.sign(
      { ...payload, type: TokenType.REFRESH, jti: `${tokenId}_refresh` },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        algorithm: jwtConfig.algorithm,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );

    // Store session data in Redis with composite key for multi-device support
    const sessionKey = `${user.id}:${tokenId}`;
    const sessionData: SessionData = {
      userId: user.id,
      loginTime: Date.now(),
      ipAddress,
      userAgent,
      lastActivity: Date.now(),
    };

    // Convert refresh token expiry to seconds for session TTL
    const sessionTtlSeconds = this.parseTimeToSeconds(jwtConfig.refreshExpiresIn);
    await storeSession(sessionKey, sessionData, sessionTtlSeconds);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Validate and decode JWT token
   */
  async validateToken(token: string): Promise<JwtPayload> {
    try {
      // Verify token signature and decode
      const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }) as JwtPayload;

      // Check if token is blacklisted
      if (decoded.jti && (await isTokenBlacklisted(decoded.jti))) {
        throw new Error('Token has been revoked');
      }

      // Validate session exists and update activity for access tokens only
      if (decoded.type === TokenType.ACCESS && decoded.jti) {
        // Extract base tokenId from jti (remove '_access' suffix)
        const baseTokenId = decoded.jti.replace('_access', '');
        const sessionKey = `${decoded.sub}:${baseTokenId}`;

        const session = await getSession(sessionKey);
        if (!session) {
          throw new Error('Session not found');
        }

        // Update session activity
        await updateSessionActivity(sessionKey);
      }

      return decoded;
    } catch (error) {
      // Check TokenExpiredError first since it extends JsonWebTokenError
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<AuthTokens> {
    // Validate refresh token
    const decoded = await this.validateToken(refreshToken);

    if (decoded.type !== TokenType.REFRESH) {
      throw new Error('Invalid token type');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: decoded.sub },
      relations: ['role'],
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Blacklist the old refresh token
    if (decoded.jti) {
      const exp = decoded.exp || Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      const ttl = exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await blacklistToken(decoded.jti, ttl);
      }
    }

    return tokens;
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      // Extract base tokenId from jti (remove '_access' or '_refresh' suffix)
      const baseTokenId = tokenId.replace(/_(access|refresh)$/, '');
      const sessionKey = `${userId}:${baseTokenId}`;
      await removeSession(sessionKey);

      // Blacklist both access and refresh tokens
      const accessTokenId = tokenId.includes('_access') ? tokenId : `${baseTokenId}_access`;
      const refreshTokenId = tokenId.includes('_refresh') ? tokenId : `${baseTokenId}_refresh`;

      // Use configuration-based TTLs
      const accessTtl = this.parseTimeToSeconds(jwtConfig.expiresIn);
      const refreshTtl = this.parseTimeToSeconds(jwtConfig.refreshExpiresIn);

      await Promise.all([
        blacklistToken(accessTokenId, accessTtl),
        blacklistToken(refreshTokenId, refreshTtl),
      ]);
    } else {
      // Remove all user sessions by scanning for the pattern
      await this.removeAllUserSessions(userId);
    }
  }

  /**
   * Remove all sessions for a user
   */
  private async removeAllUserSessions(userId: string): Promise<void> {
    // This would ideally use a Redis utility function to scan and delete
    // For now, fall back to the legacy single session removal
    await removeSession(userId);
  }

  /**
   * Parse time string to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([dhms])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60; // days to seconds
      case 'h':
        return value * 60 * 60; // hours to seconds
      case 'm':
        return value * 60; // minutes to seconds
      case 's':
        return value; // seconds
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Get user by ID with role information
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
  }

  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    return !!user;
  }
}

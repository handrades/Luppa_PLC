/**
 * Authentication Service
 *
 * Handles user authentication, JWT token generation/validation,
 * and session management with Redis.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
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

  constructor() {
    validateJwtConfig();
    this.userRepository = AppDataSource.getRepository(User);
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
    const tokenId = `${user.id}_${Date.now()}`;

    // Create JWT payload
    const payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      permissions: user.role?.permissions || {},
      iss: jwtConfig.issuer,
      aud: jwtConfig.audience,
    };

    // Generate access token
    const accessToken = jwt.sign(
      { ...payload, type: TokenType.ACCESS, jti: `${tokenId}_access` },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.expiresIn,
        algorithm: jwtConfig.algorithm,
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { ...payload, type: TokenType.REFRESH, jti: `${tokenId}_refresh` },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
        algorithm: jwtConfig.algorithm,
      }
    );

    // Store session data in Redis
    const sessionData: SessionData = {
      userId: user.id,
      loginTime: Date.now(),
      ipAddress,
      userAgent,
      lastActivity: Date.now(),
    };

    await storeSession(user.id, sessionData, 7 * 24 * 60 * 60); // 7 days

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
      if (decoded.type === TokenType.ACCESS) {
        const session = await getSession(decoded.sub);
        if (!session) {
          throw new Error('Session not found');
        }

        // Update session activity
        await updateSessionActivity(decoded.sub);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
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
    // Remove session from Redis
    await removeSession(userId);

    // Blacklist token if provided
    if (tokenId) {
      await blacklistToken(tokenId, 24 * 60 * 60); // 24 hours
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

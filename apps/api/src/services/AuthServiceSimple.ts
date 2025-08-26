/**
 * Simplified Auth Service for testing
 * This is a temporary implementation that works with the actual database schema
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TokenType, jwtConfig } from '../config/jwt';

export interface SimpleLoginResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export class AuthServiceSimple {
  private manager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.manager = entityManager;
  }

  async login(email: string, password: string): Promise<SimpleLoginResult> {
    // Query user directly from database
    const userResult = await this.manager.query(
      `SELECT id, email, first_name, last_name, password_hash, is_active 
       FROM core.users 
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!userResult || userResult.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResult[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate simple tokens
    // Environment-gated permissions approach
    const isAdminGranted =
      process.env.SIMPLE_AUTH_GRANT_ADMIN === 'true' && process.env.NODE_ENV !== 'production';

    let permissions: Record<string, Record<string, boolean>>;

    if (isAdminGranted) {
      // Full admin permissions only in non-production with explicit flag
      permissions = {
        sites: { create: true, read: true, update: true, delete: true },
        cells: { create: true, read: true, update: true, delete: true },
        equipment: { create: true, read: true, update: true, delete: true },
      };
    } else {
      // Minimal permissions (least privilege)
      permissions = {
        sites: { create: false, read: true, update: false, delete: false },
        cells: { create: false, read: true, update: false, delete: false },
        equipment: { create: false, read: true, update: false, delete: false },
      };
    }

    // Generate unique JTI for each token
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      type: TokenType.ACCESS,
      jti: accessJti,
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      type: TokenType.REFRESH,
      jti: refreshJti,
    };

    const accessToken = jwt.sign(accessPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    const refreshToken = jwt.sign(refreshPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshExpiresIn,
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    // Update last login
    await this.manager.query(
      `UPDATE core.users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    };
  }

  async validateToken(token: string): Promise<string | jwt.JwtPayload> {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm as jwt.Algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

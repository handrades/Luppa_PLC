/**
 * Simplified Auth Service for testing
 * This is a temporary implementation that works with the actual database schema
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { EntityManager } from 'typeorm';
import { jwtConfig } from '../config/jwt';

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
    const payload = {
      sub: user.id,
      email: user.email,
      // Hardcode admin permissions for testing
      permissions: {
        sites: { create: true, read: true, update: true, delete: true },
        cells: { create: true, read: true, update: true, delete: true },
        equipment: { create: true, read: true, update: true, delete: true },
      },
    };

    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: '1h',
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
    });

    const refreshToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: '7d',
      algorithm: jwtConfig.algorithm as jwt.Algorithm,
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
      });
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

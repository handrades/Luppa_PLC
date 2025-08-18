/**
 * JWT Configuration and Constants
 */

// Get JWT secret with validation
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  // In test environment, provide a fallback
  if (process.env.NODE_ENV === 'test' && !secret) {
    return 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing';
  }

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
};

export const jwtConfig = {
  secret: getJwtSecret(),
  expiresIn: '24h', // 24 hour access token
  refreshExpiresIn: '7d', // 7 day refresh token
  issuer: 'luppa-plc-api',
  audience: 'luppa-plc-client',
  algorithm: 'HS256' as const,
} as const;

/**
 * Validate JWT configuration on startup
 * Note: Validation now occurs during jwtConfig initialization
 */
export const validateJwtConfig = (): void => {
  // Validation is handled by getJwtSecret() during config initialization
  // This function is kept for backward compatibility
};

/**
 * JWT Token Types
 */
export enum TokenType {
  // eslint-disable-next-line no-unused-vars
  ACCESS = 'access',
  // eslint-disable-next-line no-unused-vars
  REFRESH = 'refresh',
}

/**
 * JWT Payload Interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roleId: string;
  permissions: string[] | Record<string, unknown>; // Support both array and object formats
  type: TokenType;
  jti?: string; // JWT ID for token tracking
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

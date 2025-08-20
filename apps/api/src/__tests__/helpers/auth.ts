/**
 * Auth Helper
 *
 * Utilities for creating test authentication tokens
 */

import jwt from 'jsonwebtoken';
import { TokenType, jwtConfig } from '../../config/jwt';

/**
 * Creates a real JWT token for testing
 */
export function createAuthToken(user: {
  id: string;
  email: string;
  permissions: string[];
}): string {
  const tokenPayload = {
    sub: user.id,
    email: user.email,
    roleId: 'test-role',
    permissions: user.permissions,
    type: TokenType.ACCESS,
    iss: jwtConfig.issuer,
    aud: jwtConfig.audience,
  };

  // Create a real JWT token using the test secret
  const token = jwt.sign(tokenPayload, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: '1h',
  });

  return token;
}

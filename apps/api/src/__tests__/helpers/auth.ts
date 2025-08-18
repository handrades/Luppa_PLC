/**
 * Auth Helper
 *
 * Utilities for creating test authentication tokens
 */

/**
 * Creates a mock JWT token for testing
 * This is a simplified version that just returns a test token
 */
export function createAuthToken(user: {
  id: string;
  email: string;
  permissions: string[];
}): string {
  // In a real implementation, this would create an actual JWT token
  // For testing purposes, we return a mock token that includes user info
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // Return a base64 encoded mock token
  // In real tests, this would be a proper JWT signed with the test secret
  return `Bearer.${Buffer.from(JSON.stringify(tokenPayload)).toString('base64')}.signature`;
}

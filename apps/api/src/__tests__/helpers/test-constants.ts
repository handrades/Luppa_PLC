/**
 * Test Constants
 *
 * Centralized test data to avoid hardcoded secrets in individual test files
 */

// Test credentials (not real secrets - for testing only)
export const TEST_CREDENTIALS = {
  email: "test@example.com",
  // nosemgrep: generic.secrets.security.detected-generic-secret - Test password, not a real secret
  password: process.env.TEST_PASSWORD || "test-pass-123",
  // nosemgrep: generic.secrets.security.detected-generic-secret - Mock hash for testing, not a real secret
  hashedPassword: "hashed-password",
  // nosemgrep: generic.secrets.security.detected-generic-secret - Test password, not a real secret
  wrongPassword: "wrong-pass",
  shortPassword: "123", // For validation testing
} as const;

// JWT test configuration (not real secrets - for testing only)
export const TEST_JWT = {
  // nosemgrep: generic.secrets.security.detected-generic-secret - JWT test secret, not a real secret
  secret:
    process.env.TEST_JWT_SECRET || "test-jwt-secret-that-is-at-least-32-chars",
  userId: "user-123",
  email: TEST_CREDENTIALS.email,
  roleId: "role-123",
  tokenId: "token-123",
} as const;

// Test user data
export const TEST_USER = {
  id: TEST_JWT.userId,
  email: TEST_JWT.email,
  firstName: "Test",
  lastName: "User",
  roleId: TEST_JWT.roleId,
  roleName: "Admin",
  permissions: { plc: { read: true } },
  isActive: true,
  passwordHash: TEST_CREDENTIALS.hashedPassword,
} as const;

// Database test data
export const TEST_DB = {
  host: "localhost",
  port: 5432,
  name: "test_db",
  user: "test_user",
  // nosemgrep: generic.secrets.security.detected-generic-secret - Test DB password, not a real secret
  password: process.env.TEST_DB_PASSWORD || "test-db-pass",
} as const;

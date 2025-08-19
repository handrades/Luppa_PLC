/**
 * Test Database Setup for PostgreSQL Integration Tests
 *
 * This module provides utilities for setting up and tearing down PostgreSQL
 * test databases for entity testing. It ensures tests run against actual
 * PostgreSQL features rather than SQLite compatibility mode.
 */

import { DataSource } from "typeorm";
import {
  AuditLog,
  Cell,
  Equipment,
  Notification,
  PLC,
  Role,
  Site,
  Tag,
  User,
} from "../../entities";

/**
 * Create a test DataSource using PostgreSQL for integration testing
 * Uses environment variables for connection, falls back to test defaults
 */
export const createTestDataSource = (): DataSource => {
  return new DataSource({
    type: "postgres",
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT || "5434", 10), // Use dedicated test port
    username: process.env.TEST_DB_USER || "testuser",
    // nosemgrep: generic.secrets.security.detected-generic-secret - Test DB password, not a real secret
    password: process.env.TEST_DB_PASSWORD || "testpass",
    database: process.env.TEST_DB_NAME || "luppa_plc_test",
    entities: [
      User,
      Role,
      Site,
      Cell,
      Equipment,
      PLC,
      Tag,
      AuditLog,
      Notification,
    ],

    // Test-specific settings
    synchronize: true, // Auto-create schema for testing
    dropSchema: true, // Clean slate for each test run
    logging: false, // Suppress SQL logs during tests

    // Connection pool settings for tests
    extra: {
      max: 5, // Smaller pool for tests
      min: 1,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    },
  });
};

/**
 * Test fixture for creating standard test users and roles
 * Returns objects that can be reused across multiple test files
 */
export const createTestFixtures = async (dataSource: DataSource) => {
  // Create test role with minimal permissions
  const testRole = dataSource.manager.create(Role, {
    name: "TestRole",
    permissions: {
      sites: { read: true, create: true, update: true, delete: true },
      cells: { read: true, create: true, update: true, delete: true },
      equipment: { read: true, create: true, update: true, delete: true },
      plcs: { read: true, create: true, update: true, delete: true },
      tags: { read: true, create: true, update: true, delete: true },
    },
    description: "Test role with full permissions",
    isSystem: false,
  });
  await dataSource.manager.save(testRole);

  // Create test user linked to test role
  const testUser = dataSource.manager.create(User, {
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    // nosemgrep: generic.secrets.security.detected-generic-secret - Mock password hash for testing, not a real secret
    passwordHash:
      "$2b$10$rK8JcGRZ8eZVKvw8rK8JcGRZ8eZVKvw8rK8JcGRZ8eZVKvw8rK8JcO", // "password"
    roleId: testRole.id,
    isActive: true,
  });
  await dataSource.manager.save(testUser);

  return {
    testRole,
    testUser,
  };
};

/**
 * Database health check for test environment
 * Verifies PostgreSQL connection and required extensions
 */
export const checkTestDatabaseHealth = async (
  dataSource: DataSource,
): Promise<boolean> => {
  try {
    // Basic connection test
    await dataSource.query("SELECT 1");

    // Check for required PostgreSQL extensions
    const extensions = await dataSource.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `);

    const hasUuidOssp = extensions.some(
      (ext: { extname: string }) => ext.extname === "uuid-ossp",
    );
    const hasPgCrypto = extensions.some(
      (ext: { extname: string }) => ext.extname === "pgcrypto",
    );

    if (!hasUuidOssp || !hasPgCrypto) {
      // eslint-disable-next-line no-console
      console.warn("Missing required PostgreSQL extensions for testing");
      return false;
    }

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Test database health check failed:", error);
    return false;
  }
};

/**
 * Clean up test data between tests
 * Truncates all tables while preserving schema
 */
export const cleanTestData = async (dataSource: DataSource): Promise<void> => {
  const entities = dataSource.entityMetadatas;

  try {
    // Disable foreign key checks temporarily
    await dataSource.query("SET session_replication_role = replica;");

    // Truncate all tables
    for (const entity of entities) {
      await dataSource.query(
        `TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`,
      );
    }

    // Re-enable foreign key checks
    await dataSource.query("SET session_replication_role = DEFAULT;");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to clean test data:", error);
    throw error;
  }
};

/**
 * Setup test database with proper error handling and connection management
 */
export const setupTestDatabase = async (): Promise<{
  dataSource: DataSource;
  fixtures: Awaited<ReturnType<typeof createTestFixtures>>;
}> => {
  const dataSource = createTestDataSource();

  try {
    await dataSource.initialize();

    // Verify database health
    const isHealthy = await checkTestDatabaseHealth(dataSource);
    if (!isHealthy) {
      throw new Error("Test database is not properly configured");
    }

    // Create standard test fixtures
    const fixtures = await createTestFixtures(dataSource);

    return { dataSource, fixtures };
  } catch (error) {
    // Clean up on failure
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    throw error;
  }
};

/**
 * Teardown test database connection
 */
export const teardownTestDatabase = async (
  dataSource: DataSource,
): Promise<void> => {
  if (dataSource?.isInitialized) {
    try {
      await dataSource.destroy();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error closing test database connection:", error);
    }
  }
};

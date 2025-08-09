// Jest setup file for API tests
require('reflect-metadata');
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Set JWT secrets before any modules load to prevent validation failures
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    'test-jwt-secret-that-is-at-least-32-characters-long-for-testing-purposes';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET =
    'test-jwt-refresh-secret-that-is-at-least-32-characters-long-for-testing-purposes';
}

// Mock logger to avoid file writes during testing
jest.mock('./src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  httpLogStream: {
    write: jest.fn(),
  },
}));

// Note: Database health check mocking is handled in individual test files as needed

// Increase timeout for integration tests
jest.setTimeout(10000);

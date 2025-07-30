// Jest setup file for API tests
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Mock logger to avoid file writes during testing
jest.mock('./src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  httpLogStream: {
    write: jest.fn()
  }
}));

// Note: Database health check mocking is handled in individual test files as needed

// Increase timeout for integration tests
jest.setTimeout(10000);

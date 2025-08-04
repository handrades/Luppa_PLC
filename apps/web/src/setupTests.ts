import '@testing-library/jest-dom';

// Mock Vite environment for Jest tests
(globalThis as { __VITE_ENV__?: Record<string, string | boolean> }).__VITE_ENV__ = {
  VITE_API_URL: '/api',
  VITE_API_TIMEOUT: '10000',
  VITE_APP_NAME: 'Luppa Inventory Test',
  VITE_APP_VERSION: '0.1.0',
  VITE_APP_ENVIRONMENT: 'test',
  VITE_AUTH_TOKEN_KEY: 'authToken',
  VITE_AUTH_SESSION_TIMEOUT: '3600000',
  VITE_LOG_LEVEL: 'info',
  DEV: false,
  PROD: false,
  MODE: 'test',
};

// Set NODE_ENV for proper Jest environment detection
process.env.NODE_ENV = 'test';

// Mock crypto.randomUUID for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: (() => {
      let counter = 0;
      return () => `test-uuid-${++counter}`;
    })(),
  },
});

// Mock Vite environment for Jest tests
(globalThis as { __VITE_ENV__?: Record<string, string | boolean> }).__VITE_ENV__ = {
  VITE_API_URL: '/api/v1',
  VITE_API_TIMEOUT: '10000',
  VITE_APP_NAME: 'Luppa Inventory',
  VITE_APP_VERSION: '0.1.0',
  VITE_APP_ENVIRONMENT: 'test',
  VITE_AUTH_TOKEN_KEY: 'authToken',
  VITE_AUTH_SESSION_TIMEOUT: '3600000',
  VITE_LOG_LEVEL: 'info',
  DEV: false,
  PROD: false,
  MODE: 'test',
};

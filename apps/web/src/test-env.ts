// Test environment setup for Jest
// This file mocks import.meta.env for test environments

export const testEnv = {
  VITE_API_URL: 'http://localhost:3010/api/v1',
  VITE_API_TIMEOUT: '10000',
  VITE_DEV_PROXY_ENABLED: 'false',
  VITE_DEV_SERVER_PORT: '3100',
  VITE_BUILD_SOURCEMAP: 'false',
  VITE_BUILD_MINIFY: 'false',
  VITE_APP_NAME: 'Luppa Inventory Test',
  VITE_APP_VERSION: '0.1.0',
  VITE_APP_ENVIRONMENT: 'test',
  VITE_ENABLE_DEBUG_MODE: 'false',
  VITE_ENABLE_MOCK_DATA: 'false',
  VITE_AUTH_TOKEN_KEY: 'authToken',
  VITE_AUTH_USER_KEY: 'user',
  VITE_AUTH_SESSION_TIMEOUT: '3600000',
  VITE_LOG_LEVEL: 'info',
  VITE_ENABLE_CONSOLE_LOGS: 'false',
  NODE_ENV: 'test',
  DEV: 'false',
  PROD: 'false',
  MODE: 'test',
};

// Set process.env for test environment
Object.assign(process.env, testEnv);

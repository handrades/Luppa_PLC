// Environment configuration utilities

// Helper function to get environment variables with fallback for Jest
function getEnvVar(key: string, defaultValue?: string): string {
  // For Jest/Node.js environment
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return process.env[key] || defaultValue || '';
  }

  // For Vite/browser environment
  if (typeof window !== 'undefined' || typeof process === 'undefined') {
    // Use dynamic import to avoid static analysis issues in Jest
    const meta = (globalThis as { __VITE_ENV__?: Record<string, string> }).__VITE_ENV__ || {};
    return meta[key] || defaultValue || '';
  }

  // Fallback to process.env for Node.js environments
  return process.env[key] || defaultValue || '';
}

function getBooleanEnvVar(key: string, defaultValue = false): boolean {
  return getEnvVar(key) === 'true' || defaultValue;
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = getEnvVar(key);
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const env = {
  // API Configuration
  API_URL: getEnvVar('VITE_API_URL', '/api'),
  API_TIMEOUT: getNumberEnvVar('VITE_API_TIMEOUT', 10000),

  // Development Settings
  DEV_PROXY_ENABLED: getBooleanEnvVar('VITE_DEV_PROXY_ENABLED'),
  DEV_SERVER_PORT: getNumberEnvVar('VITE_DEV_SERVER_PORT', 3100),

  // Build Configuration
  BUILD_SOURCEMAP: getBooleanEnvVar('VITE_BUILD_SOURCEMAP'),
  BUILD_MINIFY: getBooleanEnvVar('VITE_BUILD_MINIFY'),

  // Application Settings
  APP_NAME: getEnvVar('VITE_APP_NAME', 'Luppa Inventory'),
  APP_VERSION: getEnvVar('VITE_APP_VERSION', '0.1.0'),
  APP_ENVIRONMENT: getEnvVar('VITE_APP_ENVIRONMENT', 'development'),

  // Feature Flags
  ENABLE_DEBUG_MODE: getBooleanEnvVar('VITE_ENABLE_DEBUG_MODE'),
  ENABLE_MOCK_DATA: getBooleanEnvVar('VITE_ENABLE_MOCK_DATA'),

  // Authentication
  AUTH_TOKEN_KEY: getEnvVar('VITE_AUTH_TOKEN_KEY', 'authToken'),
  AUTH_USER_KEY: getEnvVar('VITE_AUTH_USER_KEY', 'user'),
  AUTH_SESSION_TIMEOUT: getNumberEnvVar('VITE_AUTH_SESSION_TIMEOUT', 3600000),

  // Logging
  LOG_LEVEL: getEnvVar('VITE_LOG_LEVEL', 'info'),
  ENABLE_CONSOLE_LOGS: getBooleanEnvVar('VITE_ENABLE_CONSOLE_LOGS'),

  // Runtime checks
  isDevelopment: getEnvVar('NODE_ENV') === 'development' || getBooleanEnvVar('DEV'),
  isProduction: getEnvVar('NODE_ENV') === 'production' || getBooleanEnvVar('PROD'),
  mode: getEnvVar('MODE', 'development'),
};

// Validate required environment variables
export function validateEnvironment() {
  const requiredVars = ['VITE_API_URL'];
  const missing: string[] = [];

  requiredVars.forEach(varName => {
    if (!getEnvVar(varName)) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Missing required environment variables:', missing);
    if (env.isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Validate numeric values
  if (isNaN(env.API_TIMEOUT) || env.API_TIMEOUT <= 0) {
    // eslint-disable-next-line no-console
    console.warn('Invalid API_TIMEOUT, using default value');
  }

  if (isNaN(env.DEV_SERVER_PORT) || env.DEV_SERVER_PORT <= 0) {
    // eslint-disable-next-line no-console
    console.warn('Invalid DEV_SERVER_PORT, using default value');
  }
}

// Initialize environment validation
if (env.isProduction) {
  validateEnvironment();
}

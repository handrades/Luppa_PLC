// Environment configuration utilities

// Use Vite's built-in env types

// Helper function to get environment variables with fallback for Jest
function getEnvVar(key: string, defaultValue?: string): string {
  // Try to access Vite's import.meta.env first (browser environment)
  // We use eval to avoid syntax errors in environments where import.meta doesn't exist
  if (typeof window !== 'undefined') {
    try {
      // Use eval to safely check for import.meta at runtime
      // eslint-disable-next-line no-eval
      const importMetaEnv = eval(
        'typeof import.meta !== "undefined" ? import.meta.env : undefined'
      );
      if (importMetaEnv && importMetaEnv[key] !== undefined) {
        return String(importMetaEnv[key]);
      }
    } catch {
      // import.meta not available, continue to other checks
    }
  }

  // For Jest/Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return defaultValue || '';
}

function getBooleanEnvVar(key: string, defaultValue = false): boolean {
  // Try to access Vite's import.meta.env first to check for boolean type
  if (typeof window !== 'undefined') {
    try {
      // Use eval to safely check for import.meta at runtime
      // eslint-disable-next-line no-eval
      const importMetaEnv = eval(
        'typeof import.meta !== "undefined" ? import.meta.env : undefined'
      );
      if (importMetaEnv && importMetaEnv[key] !== undefined) {
        const value = importMetaEnv[key];
        if (typeof value === 'boolean') {
          return value;
        }
      }
    } catch {
      // import.meta not available, continue
    }
  }

  // Get string value
  const value = getEnvVar(key);

  // Handle explicit "true" and "false" strings (case-insensitive)
  if (value !== '') {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true') return true;
    if (lowerValue === 'false') return false;
    // If it's any other non-empty string, treat as truthy
    return true;
  }

  // Fall back to default
  return defaultValue;
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = getEnvVar(key);
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const env = {
  // API Configuration
  API_URL: getEnvVar('VITE_API_URL', '/api/v1'),
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

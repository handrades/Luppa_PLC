// Environment configuration utilities

export const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || '/api',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  
  // Development Settings
  DEV_PROXY_ENABLED: import.meta.env.VITE_DEV_PROXY_ENABLED === 'true',
  DEV_SERVER_PORT: parseInt(import.meta.env.VITE_DEV_SERVER_PORT || '3100'),
  
  // Build Configuration
  BUILD_SOURCEMAP: import.meta.env.VITE_BUILD_SOURCEMAP === 'true',
  BUILD_MINIFY: import.meta.env.VITE_BUILD_MINIFY === 'true',
  
  // Application Settings
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Luppa PLC Inventory',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',
  APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT || 'development',
  
  // Feature Flags
  ENABLE_DEBUG_MODE: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  
  // Authentication
  AUTH_TOKEN_KEY: import.meta.env.VITE_AUTH_TOKEN_KEY || 'authToken',
  AUTH_SESSION_TIMEOUT: parseInt(import.meta.env.VITE_AUTH_SESSION_TIMEOUT || '3600000'),
  
  // Logging
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  ENABLE_CONSOLE_LOGS: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true',
  
  // Runtime checks
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
}

// Validate required environment variables
export function validateEnvironment() {
  const requiredVars = ['VITE_API_URL']
  const missing: string[] = []
  
  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      missing.push(varName)
    }
  })
  
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Missing required environment variables:', missing)
    if (env.isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
  
  // Validate numeric values
  if (isNaN(env.API_TIMEOUT) || env.API_TIMEOUT <= 0) {
    // eslint-disable-next-line no-console
    console.warn('Invalid API_TIMEOUT, using default value')
  }
  
  if (isNaN(env.DEV_SERVER_PORT) || env.DEV_SERVER_PORT <= 0) {
    // eslint-disable-next-line no-console
    console.warn('Invalid DEV_SERVER_PORT, using default value')
  }
}

// Initialize environment validation
if (env.isProduction) {
  validateEnvironment()
}

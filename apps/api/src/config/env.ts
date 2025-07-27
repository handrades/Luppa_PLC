/**
 * Environment variable validation and configuration
 */

// Environment validation function
export const validateEnvironment = (): void => {
  const requiredEnvVars = {
    // These will be expanded as the application grows
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3001',
    HOST: process.env.HOST || 'localhost'
  };

  // Validate port is a valid number
  const port = parseInt(requiredEnvVars.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${requiredEnvVars.PORT}. Must be a number between 1 and 65535.`);
  }

  // Validate NODE_ENV is a known value
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(requiredEnvVars.NODE_ENV)) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: NODE_ENV '${requiredEnvVars.NODE_ENV}' is not in expected values: ${validEnvironments.join(', ')}`);
  }
};

// Environment configuration object
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173'
  ]
} as const;

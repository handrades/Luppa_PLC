/**
 * Environment variable validation and configuration
 */

/**
 * Parse and validate environment variables, returning a validated config object
 */
const createValidatedConfig = () => {
  // Parse environment variables with defaults
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3001',
    HOST: process.env.HOST || 'localhost',
    LOG_LEVEL: process.env.LOG_LEVEL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
  };

  // Validate and parse PORT
  const port = parseInt(rawEnv.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${rawEnv.PORT}. Must be a number between 1 and 65535.`);
  }

  // Validate NODE_ENV
  const validEnvironments = ['development', 'production', 'test'] as const;
  type ValidEnvironment = typeof validEnvironments[number];
  if (!validEnvironments.includes(rawEnv.NODE_ENV as ValidEnvironment)) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: NODE_ENV '${rawEnv.NODE_ENV}' is not in expected values: ${validEnvironments.join(', ')}`);
  }

  // Determine log level based on environment
  const logLevel = rawEnv.LOG_LEVEL || (rawEnv.NODE_ENV === 'production' ? 'info' : 'debug');

  // Parse allowed origins
  const allowedOrigins = rawEnv.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  return {
    env: rawEnv.NODE_ENV,
    port,
    host: rawEnv.HOST,
    logLevel,
    allowedOrigins
  } as const;
};

// Create and export validated configuration
export const config = createValidatedConfig();

// Export validation function for explicit validation calls
export const validateEnvironment = (): void => {
  // Validation is now handled in config creation
  // This function exists for backward compatibility
  createValidatedConfig();
};

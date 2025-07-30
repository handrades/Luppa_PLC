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
    PORT: process.env.PORT || '3010',
    HOST: process.env.HOST || '0.0.0.0',
    LOG_LEVEL: process.env.LOG_LEVEL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    // Database configuration
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_SSL_MODE: process.env.DB_SSL_MODE,
    DB_POOL_MIN: process.env.DB_POOL_MIN,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT,
    DB_IDLE_TIMEOUT: process.env.DB_IDLE_TIMEOUT,
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
    'http://localhost:3100',
    'http://localhost:5173'
  ];

  return {
    env: rawEnv.NODE_ENV,
    port,
    host: rawEnv.HOST,
    logLevel,
    allowedOrigins,
    // Database configuration (validation handled in database.ts)
    database: {
      host: rawEnv.DB_HOST,
      port: rawEnv.DB_PORT,
      name: rawEnv.DB_NAME,
      user: rawEnv.DB_USER,
      password: rawEnv.DB_PASSWORD,
      sslMode: rawEnv.DB_SSL_MODE,
      poolMin: rawEnv.DB_POOL_MIN,
      poolMax: rawEnv.DB_POOL_MAX,
      connectionTimeout: rawEnv.DB_CONNECTION_TIMEOUT,
      idleTimeout: rawEnv.DB_IDLE_TIMEOUT,
    }
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

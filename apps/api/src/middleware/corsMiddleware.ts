import cors from 'cors';
import { logger } from '../config/logger';

/**
 * Environment-specific CORS configuration for cross-origin requests
 *
 * This middleware configures CORS based on the current environment to ensure
 * proper security in production while enabling development workflow.
 *
 * Development Configuration:
 * - Allows localhost origins for development servers
 * - Enables credentials for authentication support
 * - Supports all standard HTTP methods
 *
 * Production Configuration:
 * - Restricts origins to specific production domains
 * - Maintains security-first approach
 * - Logs CORS violations for monitoring
 */

/**
 * Get allowed origins based on current environment
 */
const getAllowedOrigins = (): string[] => {
  // Use ALLOWED_ORIGINS environment variable if set
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Fallback to defaults based on environment
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return [
      'http://localhost:3000', // Express dev server
      'http://localhost:5173', // Vite dev server (default)
      'http://localhost:4173', // Vite preview server
    ];
  } else {
    return [
      'https://inventory.local', // Example production domain
    ];
  }
};

/**
 * CORS configuration options factory
 */
const createCorsOptions = (): cors.CorsOptions => ({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (e.g., mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS origin rejected', {
        origin,
        environment: process.env.NODE_ENV,
        allowedOrigins,
      });

      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },

  // HTTP methods allowed for cross-origin requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  // Headers allowed in cross-origin requests
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept', 'Origin'],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count', // For pagination
  ],

  // Enable credentials (cookies, authorization headers, TLS client certificates)
  credentials: true,

  // Preflight cache duration (seconds) - will be set dynamically
  get maxAge() {
    return process.env.NODE_ENV === 'production' ? 3600 : 86400; // 1 hour in prod, 24 hours in dev
  },

  // Enable preflight for all requests
  preflightContinue: false,
  optionsSuccessStatus: 204, // For legacy browser support
});

/**
 * Log CORS configuration on startup
 */
const corsConfig = createCorsOptions();

/**
 * CORS middleware factory function that creates middleware with current environment
 */
export const createCorsMiddleware = () => cors(createCorsOptions());

/**
 * CORS middleware instance configured for the current environment
 */
export const corsMiddleware = cors(corsConfig);

/**
 * Manual CORS validation for programmatic use
 *
 * @param origin - Origin to validate
 * @returns true if origin is allowed, false otherwise
 */
export const isOriginAllowed = (origin: string): boolean => {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};
logger.info('CORS middleware configured', {
  environment: process.env.NODE_ENV,
  allowedOrigins: getAllowedOrigins(),
  credentialsEnabled: corsConfig.credentials,
  maxAge: corsConfig.maxAge,
});

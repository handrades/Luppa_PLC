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
 * Check if an IP address belongs to private network ranges (RFC 1918)
 * Class A: 10.0.0.0 - 10.255.255.255
 * Class B: 172.16.0.0 - 172.31.255.255
 * Class C: 192.168.0.0 - 192.168.255.255
 * Loopback: 127.0.0.0 - 127.255.255.255
 */
const isPrivateNetwork = (hostname: string): boolean => {
  // Extract IP from hostname (could be IP:port or just IP)
  const ip = hostname.split(':')[0];

  // Check if it's an IP address pattern
  const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipPattern);

  if (!match) {
    return false;
  }

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  // Validate octets
  if (octets.some(o => o < 0 || o > 255)) {
    return false;
  }

  // Class A: 10.0.0.0/8
  if (octets[0] === 10) {
    return true;
  }

  // Class B: 172.16.0.0/12
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return true;
  }

  // Class C: 192.168.0.0/16
  if (octets[0] === 192 && octets[1] === 168) {
    return true;
  }

  // Loopback: 127.0.0.0/8
  if (octets[0] === 127) {
    return true;
  }

  return false;
};

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
    // Allow requests with no origin (e.g., mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Parse the origin URL
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // In development, allow localhost and private networks
      if (process.env.NODE_ENV !== 'production') {
        // Allow localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return callback(null, true);
        }

        // Allow private networks (Class A, B, C)
        if (isPrivateNetwork(hostname)) {
          logger.debug('CORS allowed for private network', {
            origin,
            hostname,
            environment: process.env.NODE_ENV,
          });
          return callback(null, true);
        }
      }

      // Check explicit allowed origins
      const allowedOrigins = getAllowedOrigins();
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In production with ALLOW_PRIVATE_NETWORKS flag
      if (process.env.ALLOW_PRIVATE_NETWORKS === 'true' && isPrivateNetwork(hostname)) {
        logger.info('CORS allowed for private network (production mode)', {
          origin,
          hostname,
        });
        return callback(null, true);
      }
    } catch (error) {
      logger.warn('Invalid origin URL', {
        origin,
        error: (error as Error).message,
      });
    }

    // Origin not allowed - disable CORS instead of throwing error
    logger.warn('CORS origin rejected', {
      origin,
      environment: process.env.NODE_ENV,
      allowedOrigins: getAllowedOrigins(),
    });

    callback(null, false);
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
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // In development, allow localhost and private networks
    if (process.env.NODE_ENV !== 'production') {
      if (hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateNetwork(hostname)) {
        return true;
      }
    }

    // Check explicit allowed origins
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // In production with ALLOW_PRIVATE_NETWORKS flag
    if (process.env.ALLOW_PRIVATE_NETWORKS === 'true' && isPrivateNetwork(hostname)) {
      return true;
    }
  } catch (error) {
    // Invalid URL
    return false;
  }

  return false;
};
logger.info('CORS middleware configured', {
  environment: process.env.NODE_ENV,
  allowedOrigins: getAllowedOrigins(),
  privateNetworksAllowed:
    process.env.NODE_ENV !== 'production' || process.env.ALLOW_PRIVATE_NETWORKS === 'true',
  credentialsEnabled: corsConfig.credentials,
  maxAge: corsConfig.maxAge,
});

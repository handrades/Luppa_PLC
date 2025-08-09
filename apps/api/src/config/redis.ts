/**
 * Redis Configuration for Session Management and Caching
 */

import { createClient } from 'redis';
import { config } from './env';

/**
 * Create Redis client configuration
 */
const createRedisConfig = () => {
  // Use REDIS_URL if provided, otherwise build from individual components
  if (config.redis.url) {
    return {
      url: config.redis.url,
    };
  }

  return {
    socket: {
      host: config.redis.host || 'localhost',
      port: parseInt(config.redis.port || '6379', 10),
    },
    password: config.redis.password || undefined,
  };
};

/**
 * Redis client instance
 */
export const redisClient = createClient(createRedisConfig());

/**
 * Initialize Redis connection
 */
export const initializeRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      // eslint-disable-next-line no-console
      console.log('Redis connection initialized successfully');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during Redis initialization:', error);
    throw error;
  }
};

/**
 * Close Redis connection gracefully
 */
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      // eslint-disable-next-line no-console
      console.log('Redis connection closed successfully');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during Redis shutdown:', error);
    throw error;
  }
};

/**
 * Check Redis connection health
 */
export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    if (!redisClient.isOpen) {
      return false;
    }
    await redisClient.ping();
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Redis health check failed:', error);
    return false;
  }
};

/**
 * Session Management Functions
 */
export const sessionKeys = {
  user: (userId: string) => `session:user:${userId}`,
  blacklist: (tokenId: string) => `blacklist:token:${tokenId}`,
  loginAttempts: (ip: string) => `login_attempts:${ip}`,
} as const;

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  loginTime: number;
  ipAddress: string;
  userAgent: string;
  lastActivity: number;
}

/**
 * Store user session data
 */
export const storeSession = async (
  sessionId: string,
  sessionData: SessionData,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> => {
  await redisClient.setEx(
    sessionKeys.user(sessionId),
    ttlSeconds,
    JSON.stringify(sessionData)
  );
};

/**
 * Retrieve user session data
 */
export const getSession = async (sessionId: string): Promise<SessionData | null> => {
  const data = await redisClient.get(sessionKeys.user(sessionId));
  return data ? JSON.parse(data) : null;
};

/**
 * Remove user session
 */
export const removeSession = async (sessionId: string): Promise<void> => {
  await redisClient.del(sessionKeys.user(sessionId));
};

/**
 * Blacklist a token
 */
export const blacklistToken = async (
  tokenId: string,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> => {
  await redisClient.setEx(sessionKeys.blacklist(tokenId), ttlSeconds, 'blacklisted');
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = async (tokenId: string): Promise<boolean> => {
  const result = await redisClient.get(sessionKeys.blacklist(tokenId));
  return result === 'blacklisted';
};

/**
 * Update session activity timestamp
 */
export const updateSessionActivity = async (sessionId: string): Promise<void> => {
  const session = await getSession(sessionId);
  if (session) {
    session.lastActivity = Date.now();
    await storeSession(sessionId, session);
  }
};
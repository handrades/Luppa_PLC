/**
 * Redis Configuration for Session Management and Caching
 */

import { RedisClientType, createClient } from 'redis';
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
      port: config.redis.port ? parseInt(config.redis.port.toString(), 10) : 6379,
    },
    password: config.redis.password || undefined,
  };
};

/**
 * Redis client instance
 */
export const redisClient: RedisClientType = createClient(createRedisConfig());

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
  await redisClient.setEx(sessionKeys.user(sessionId), ttlSeconds, JSON.stringify(sessionData));
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

/**
 * Get Redis memory usage and performance metrics
 */
export const getRedisMetrics = async (): Promise<{
  isConnected: boolean;
  memoryUsage?: {
    used: number;
    peak: number;
    rss: number;
    overhead: number;
  };
  performance?: {
    connectedClients: number;
    commandsProcessed: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRatio: number;
  };
  config?: {
    maxmemory: number;
    maxmemoryPolicy: string;
  };
  lastError?: string;
}> => {
  try {
    if (!redisClient.isOpen) {
      return { isConnected: false };
    }

    // Get memory and server information
    const serverInfo = await redisClient.info('memory');
    const statsInfo = await redisClient.info('stats');
    const configInfo = await redisClient.configGet(['maxmemory', 'maxmemory-policy']);

    // Parse memory info
    const memoryLines = serverInfo.split('\r\n');
    const memoryData: { [key: string]: string } = {};
    memoryLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        memoryData[key] = value;
      }
    });

    // Parse stats info
    const statsLines = statsInfo.split('\r\n');
    const statsData: { [key: string]: string } = {};
    statsLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        statsData[key] = value;
      }
    });

    // Calculate hit ratio
    const hits = parseInt(statsData.keyspace_hits || '0', 10);
    const misses = parseInt(statsData.keyspace_misses || '0', 10);
    const hitRatio = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    return {
      isConnected: true,
      memoryUsage: {
        used: parseInt(memoryData.used_memory || '0', 10),
        peak: parseInt(memoryData.used_memory_peak || '0', 10),
        rss: parseInt(memoryData.used_memory_rss || '0', 10),
        overhead: parseInt(memoryData.used_memory_overhead || '0', 10),
      },
      performance: {
        connectedClients: parseInt(statsData.connected_clients || '0', 10),
        commandsProcessed: parseInt(statsData.total_commands_processed || '0', 10),
        keyspaceHits: hits,
        keyspaceMisses: misses,
        hitRatio: Math.round(hitRatio * 100) / 100,
      },
      config: {
        maxmemory: parseInt(configInfo.maxmemory || '0', 10),
        maxmemoryPolicy: configInfo['maxmemory-policy'] || 'noeviction',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      isConnected: false,
      lastError: errorMessage,
    };
  }
};

/**
 * Enhanced Redis health check with metrics and performance data
 */
export const getRedisHealth = async (): Promise<{
  isHealthy: boolean;
  responseTime: number;
  metrics: Awaited<ReturnType<typeof getRedisMetrics>>;
  lastError?: string;
}> => {
  const startTime = Date.now();

  try {
    const isHealthy = await isRedisHealthy();
    const responseTime = Date.now() - startTime;
    const metrics = await getRedisMetrics();

    return {
      isHealthy,
      responseTime,
      metrics,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const lastError = error instanceof Error ? error.message : 'Unknown error';
    const metrics = await getRedisMetrics();

    return {
      isHealthy: false,
      responseTime,
      metrics,
      lastError,
    };
  }
};

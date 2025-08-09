import { Request, Response, Router } from 'express';
import { getDatabaseHealth } from '../config/database';
import { getRedisHealth } from '../config/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

const router: Router = Router();

/**
 * Enhanced health check response interface
 */
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  deploymentTimestamp?: string;
  version: string;
  environment: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    connectionPool?: {
      isConnected: boolean;
      totalConnections?: number;
      idleConnections?: number;
      runningConnections?: number;
      poolConfig: {
        min: number;
        max: number;
        connectionTimeoutMillis: number;
        idleTimeoutMillis: number;
      };
    };
    lastError?: string;
  };
  redis: {
    status: 'connected' | 'disconnected';
    responseTime: number;
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
  };
}

/**
 * Cached version string to avoid repeated filesystem reads
 */
let cachedVersion: string | null = null;

/**
 * Get version information from package.json (version is memoized, timestamp is dynamic)
 */
const getVersionInfo = (): { version: string; deploymentTimestamp?: string } => {
  try {
    let version = cachedVersion;

    // Only read version if not cached
    if (version === null) {
      // Try to read version from environment first
      version = process.env.npm_package_version ?? null;

      if (!version) {
        try {
          // Try reading from current working directory first (better for monorepos)
          const cwdPackageJsonPath = join(process.cwd(), 'package.json');
          const cwdPackageJson = JSON.parse(readFileSync(cwdPackageJsonPath, 'utf8'));
          version = cwdPackageJson.version;
        } catch (cwdError) {
          try {
            // Fallback: read package.json relative to this file
            const packageJsonPath = join(__dirname, '../../../package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            version = packageJson.version;
          } catch (readError) {
            version = '1.0.0';
          }
        }
      }

      // Cache the version (but not timestamp which can change)
      cachedVersion = version || '1.0.0';
    }

    // Always read deployment timestamp fresh (for test environment compatibility)
    let deploymentTimestamp: string | undefined;

    if (process.env.DEPLOYMENT_TIMESTAMP) {
      deploymentTimestamp = process.env.DEPLOYMENT_TIMESTAMP;
    } else if (process.env.BUILD_TIMESTAMP) {
      deploymentTimestamp = process.env.BUILD_TIMESTAMP;
    }

    return {
      version: cachedVersion ?? '1.0.0',
      deploymentTimestamp,
    };
  } catch (error) {
    return {
      version: '1.0.0',
    };
  }
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get system health status
 *     description: |
 *       Returns the current health status of the API server and its dependencies.
 *       This endpoint is used for monitoring and load balancer health checks.
 *
 *       The endpoint checks:
 *       - Database connectivity
 *       - Server uptime
 *       - System resources
 *
 *       Returns HTTP 200 for healthy status, HTTP 503 for unhealthy status.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: healthy
 *               timestamp: '2025-01-24T10:30:00.000Z'
 *               version: '1.0.0'
 *               environment: 'development'
 *               uptime: 3600
 *               database:
 *                 status: connected
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: unhealthy
 *               timestamp: '2025-01-24T10:30:00.000Z'
 *               version: '1.0.0'
 *               environment: 'development'
 *               uptime: 3600
 *               database:
 *                 status: disconnected
 */
router.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Get enhanced health information for both database and Redis
    const [dbHealth, redisHealth] = await Promise.all([getDatabaseHealth(), getRedisHealth()]);

    const overallHealthy = dbHealth.isHealthy && redisHealth.isHealthy;
    const versionInfo = getVersionInfo();

    const healthResponse: HealthResponse = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      deploymentTimestamp: versionInfo.deploymentTimestamp,
      version: versionInfo.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbHealth.isHealthy ? 'connected' : 'disconnected',
        responseTime: dbHealth.responseTime,
        connectionPool: dbHealth.poolStats,
        lastError: dbHealth.lastError,
      },
      redis: {
        status: redisHealth.isHealthy ? 'connected' : 'disconnected',
        responseTime: redisHealth.responseTime,
        memoryUsage: redisHealth.metrics?.memoryUsage,
        performance: redisHealth.metrics?.performance,
        config: redisHealth.metrics?.config,
        lastError: redisHealth.lastError || redisHealth.metrics?.lastError,
      },
    };

    // Measure total response time
    const totalResponseTime = Date.now() - startTime;

    // Log warning if response time exceeds 100ms requirement
    if (totalResponseTime > 100) {
      // eslint-disable-next-line no-console
      console.warn(`Health check response time exceeded 100ms: ${totalResponseTime}ms`);
    }

    const statusCode = overallHealthy ? 200 : 503;

    // Prevent caching by intermediaries
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    const versionInfo = getVersionInfo();
    const totalResponseTime = Date.now() - startTime;

    const healthResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      deploymentTimestamp: versionInfo.deploymentTimestamp,
      version: versionInfo.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      database: {
        status: 'disconnected',
        responseTime: totalResponseTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      },
      redis: {
        status: 'disconnected',
        responseTime: totalResponseTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    // eslint-disable-next-line no-console
    console.error('Health check failed:', error);
    res.status(503).json(healthResponse);
  }
});

export default router;

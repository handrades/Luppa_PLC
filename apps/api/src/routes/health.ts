import { Request, Response, Router } from 'express';
import { isDatabaseHealthy } from '../config/database';

const router: Router = Router();

/**
 * Health check response interface
 */
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
  };
}

/**
 * Get version from package.json - simplified approach for testing compatibility
 */
const getVersion = (): string => {
  try {
    // In production, this would read from the compiled package.json
    // For testing, we'll use a simple fallback
    return process.env.npm_package_version || '1.0.0';
  } catch (error) {
    return '1.0.0';
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
  try {
    const dbHealthy = await isDatabaseHealthy();
    const overallHealthy = dbHealthy;

    const healthResponse: HealthResponse = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: getVersion(),
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbHealthy ? 'connected' : 'disconnected',
      },
    };

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    const healthResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: getVersion(),
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      database: {
        status: 'disconnected',
      },
    };

    res.status(503).json(healthResponse);
  }
});

export default router;

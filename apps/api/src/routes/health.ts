import { Request, Response, Router } from 'express';
import { isDatabaseHealthy } from '../config/database';

const router: Router = Router();

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

// Get version from package.json - simplified approach for testing compatibility
const getVersion = (): string => {
  try {
    // In production, this would read from the compiled package.json
    // For testing, we'll use a simple fallback
    return process.env.npm_package_version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
};

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
        status: dbHealthy ? 'connected' : 'disconnected'
      }
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
        status: 'disconnected'
      }
    };

    res.status(503).json(healthResponse);
  }
});

export default router;

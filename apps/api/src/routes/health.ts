import { Request, Response, Router } from 'express';

const router: Router = Router();

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
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

router.get('/health', (_req: Request, res: Response) => {
  const healthResponse: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: getVersion(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime())
  };

  res.status(200).json(healthResponse);
});

export default router;

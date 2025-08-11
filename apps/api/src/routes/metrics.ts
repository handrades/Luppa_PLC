import { Request, Response, Router } from 'express';
import { MetricsService } from '../services/MetricsService';
import { logger } from '../config/logger';

const router: Router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: |
 *       Returns application metrics in Prometheus exposition format.
 *       This endpoint is used by Prometheus for scraping metrics data.
 *
 *       Metrics include:
 *       - HTTP request counters and durations
 *       - Database connection pool status
 *       - Redis performance metrics
 *       - User operation counters
 *       - Audit log entry counters
 *       - System resource utilization
 *     tags: [Monitoring]
 *     security: []
 *     responses:
 *       200:
 *         description: Metrics data in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: |
 *                 # HELP http_requests_total Total number of HTTP requests
 *                 # TYPE http_requests_total counter
 *                 http_requests_total{method="GET",route="/api/health",status_code="200"} 45
 *
 *                 # HELP database_connections_active Number of active database connections
 *                 # TYPE database_connections_active gauge
 *                 database_connections_active 3
 *       500:
 *         description: Error collecting metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "# Failed to collect metrics"
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const metrics = await MetricsService.getPrometheusMetrics();

    const responseTime = Date.now() - startTime;

    // Log warning if response time exceeds 50ms requirement
    if (responseTime > 50) {
      logger.warn(`Metrics endpoint response time exceeded 50ms: ${responseTime}ms`);
    }

    res.set({
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.status(200).send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint error:', error);

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.status(500).send('# Failed to collect metrics\n');
  }
});

export default router;

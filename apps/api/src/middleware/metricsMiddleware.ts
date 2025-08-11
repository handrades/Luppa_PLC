import { NextFunction, Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';
import { logger } from '../config/logger';

/**
 * Middleware to automatically collect HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Override res.end to capture metrics when response finishes
  const originalEnd = res.end;

  res.end = function (this: Response, ...args: unknown[]): Response {
    const duration = Date.now() - startTime;

    try {
      // Collect HTTP metrics
      MetricsService.collectHttpMetrics(req, res, duration);

      // Collect user operation metrics if user is authenticated
      if (req.user) {
        const operation = `${req.method.toLowerCase()}_${req.route?.path || req.path}`;
        MetricsService.collectUserOperationMetrics(operation, req.user.roleId);
      }
    } catch (error) {
      logger.error('Failed to collect metrics in middleware:', error);
    }

    // Call the original end function
    return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
  };

  next();
};

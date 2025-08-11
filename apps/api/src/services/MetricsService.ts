import { Request, Response } from 'express';
import {
  apiResponseTimePercentiles,
  auditLogEntriesTotal,
  databaseConnectionsActive,
  databaseConnectionsIdle,
  databasePoolUtilization,
  databaseQueryDuration,
  httpRequestDuration,
  httpRequestsTotal,
  redisMemoryUsedBytes,
  redisOperationsTotal,
  register,
  reinitializeMetrics,
  userOperationsTotal,
} from '../config/prometheus';
import { getDatabaseHealth } from '../config/database';
import { getRedisHealth } from '../config/redis';
import { logger } from '../config/logger';

export class MetricsService {
  /**
   * Collect HTTP request metrics
   */
  static collectHttpMetrics(req: Request, res: Response, duration: number): void {
    const method = req.method;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Increment request counter
    httpRequestsTotal.inc({ method, route, status_code: statusCode });

    // Record request duration
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000);

    // Record API response time percentiles
    apiResponseTimePercentiles.observe({ endpoint: route }, duration / 1000);
  }

  /**
   * Collect database performance metrics
   */
  static collectDatabaseMetrics(queryTime: number, operation: string, table?: string): void {
    databaseQueryDuration.observe({ operation, table: table || 'unknown' }, queryTime / 1000);
  }

  /**
   * Collect user operation metrics
   */
  static collectUserOperationMetrics(operation: string, userRole?: string): void {
    userOperationsTotal.inc({
      operation,
      user_role: userRole || 'anonymous',
    });
  }

  /**
   * Collect audit logging metrics
   */
  static collectAuditMetrics(riskLevel: string, tableName: string): void {
    auditLogEntriesTotal.inc({
      risk_level: riskLevel,
      table_name: tableName,
    });
  }

  /**
   * Collect Redis operation metrics
   */
  static collectRedisMetrics(
    operation: string,
    result: 'hit' | 'miss' | 'success' | 'error'
  ): void {
    redisOperationsTotal.inc({ operation, result });
  }

  /**
   * Update database connection pool metrics
   */
  static async updateDatabasePoolMetrics(): Promise<void> {
    try {
      const dbHealth = await getDatabaseHealth();

      if (dbHealth.poolStats) {
        const {
          totalConnections = 0,
          idleConnections = 0,
          runningConnections = 0,
        } = dbHealth.poolStats;
        const { max = 10 } = dbHealth.poolStats.poolConfig || {};

        databaseConnectionsActive.set(runningConnections);
        databaseConnectionsIdle.set(idleConnections);

        // Calculate pool utilization percentage
        const utilization = totalConnections > 0 ? (totalConnections / max) * 100 : 0;
        databasePoolUtilization.set(utilization);
      }
    } catch (error) {
      logger.error('Failed to update database pool metrics:', error);
    }
  }

  /**
   * Update Redis memory metrics
   */
  static async updateRedisMetrics(): Promise<void> {
    try {
      const redisHealth = await getRedisHealth();

      if (redisHealth.metrics?.memoryUsage) {
        redisMemoryUsedBytes.set(redisHealth.metrics.memoryUsage.used);
      }
    } catch (error) {
      logger.error('Failed to update Redis metrics:', error);
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  static async getPrometheusMetrics(): Promise<string> {
    try {
      // Check if registry is empty and reinitialize if needed (common in tests)
      const currentMetrics = await register.metrics();
      if (!currentMetrics || currentMetrics.trim() === '') {
        reinitializeMetrics();
      }

      // Update dynamic metrics before generating output
      await Promise.all([this.updateDatabasePoolMetrics(), this.updateRedisMetrics()]);

      const metrics = await register.metrics();

      // If still no metrics after reinitializing, return a basic metrics response
      if (!metrics || metrics.trim() === '') {
        return (
          '# HELP luppa_service_info Information about the Luppa service\n' +
          '# TYPE luppa_service_info gauge\n' +
          'luppa_service_info{version="1.0.0",service="api"} 1\n'
        );
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
      return (
        '# Failed to collect metrics\n' +
        '# HELP luppa_metrics_collection_errors_total Total number of metrics collection errors\n' +
        '# TYPE luppa_metrics_collection_errors_total counter\n' +
        'luppa_metrics_collection_errors_total 1\n'
      );
    }
  }
}

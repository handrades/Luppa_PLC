import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';

// Enable collection of default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Function to reinitialize metrics after register.clear() is called (for testing)
export const reinitializeMetrics = () => {
  // Re-enable default metrics collection
  collectDefaultMetrics({ register });

  // Re-register all our custom metrics
  register.registerMetric(httpRequestsTotal);
  register.registerMetric(httpRequestDuration);
  register.registerMetric(databaseQueryDuration);
  register.registerMetric(databaseConnectionsActive);
  register.registerMetric(databaseConnectionsIdle);
  register.registerMetric(redisMemoryUsedBytes);
  register.registerMetric(redisOperationsTotal);
  register.registerMetric(userOperationsTotal);
  register.registerMetric(auditLogEntriesTotal);
  register.registerMetric(apiResponseTimePercentiles);
  register.registerMetric(databasePoolUtilization);
};

// HTTP Request Counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Database Query Duration Histogram
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Database Connection Pool Gauges
export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const databaseConnectionsIdle = new Gauge({
  name: 'database_connections_idle',
  help: 'Number of idle database connections',
  registers: [register],
});

// Redis Memory Usage Gauge
export const redisMemoryUsedBytes = new Gauge({
  name: 'redis_memory_used_bytes',
  help: 'Redis memory usage in bytes',
  registers: [register],
});

// Redis Hit/Miss Counters
export const redisOperationsTotal = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'result'],
  registers: [register],
});

// User Operations Counter
export const userOperationsTotal = new Counter({
  name: 'user_operations_total',
  help: 'Total number of user operations',
  labelNames: ['operation', 'user_role'],
  registers: [register],
});

// Audit Log Entries Counter
export const auditLogEntriesTotal = new Counter({
  name: 'audit_log_entries_total',
  help: 'Total number of audit log entries',
  labelNames: ['risk_level', 'table_name'],
  registers: [register],
});

// API Response Time Summary
export const apiResponseTimePercentiles = new Histogram({
  name: 'api_response_time_percentiles',
  help: 'API response time percentiles',
  labelNames: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99],
  registers: [register],
});

// Database Pool Utilization Gauge
export const databasePoolUtilization = new Gauge({
  name: 'database_pool_utilization',
  help: 'Database connection pool utilization percentage',
  registers: [register],
});

export { register };

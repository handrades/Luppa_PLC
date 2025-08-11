import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';

// Import middleware and configuration
import { securityMiddleware } from './middleware/securityMiddleware';
import { requestIdMiddleware } from './middleware/requestId';
import { corsMiddleware } from './middleware/corsMiddleware';
import { compressionMiddleware } from './middleware/compressionMiddleware';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { auditContextMiddleware } from './middleware/auditContext';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ValidationError } from './errors/ValidationError';
import { logger } from './config/logger';
import { config as appConfig } from './config/env';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';

// Import routes
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import auditRouter from './routes/audit';
import usersRouter from './routes/users';
import metricsRouter from './routes/metrics';

// Load environment variables
config();

// Extend Express Request interface for raw body support
// Express Request interface augmented in types/express.d.ts

// Extend Node.js IncomingMessage for express.json verify function
declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

export const createApp = (): express.Application => {
  const app = express();

  // Trust proxy for accurate client IP addresses
  app.set('trust proxy', 1);

  /*
   * MIDDLEWARE ORDER (CRITICAL FOR PROPER FUNCTIONALITY):
   * 1. Security headers middleware (first for security)
   * 2. Request ID middleware (for request tracing)
   * 3. CORS middleware (for cross-origin support)
   * 4. Compression middleware (for response optimization)
   * 5. Body parsing middleware (existing express.json())
   * 6. Logging middleware (for request tracking)
   * 7. Authentication middleware (existing auth.ts)
   * 8. Audit context middleware (existing auditContext.ts)
   * 9. Metrics middleware (existing metricsMiddleware.ts)
   * 10. Route handlers
   * 11. 404 not found handler (existing notFoundHandler)
   * 12. Error handling middleware (existing errorHandler - must be last)
   */

  // 1. Security headers middleware (OWASP-compliant, environment-aware)
  app.use(securityMiddleware);

  // 2. Request ID middleware (for request tracing)
  app.use(requestIdMiddleware);

  // 3. CORS middleware (environment-specific configuration)
  app.use(corsMiddleware);

  // 4. Compression middleware (optimized for JSON responses)
  app.use(compressionMiddleware);

  // 5. Body parsing middleware (with error handling)
  app.use((req, res, next) => {
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf;
      },
    })(req, res, err => {
      if (err) {
        // Handle JSON parsing errors
        if (err.type === 'entity.parse.failed') {
          const error = new ValidationError('Invalid JSON format', [
            {
              field: 'body',
              message: 'Invalid JSON format',
              value: err.body?.substring(0, 100), // Only include first 100 chars
            },
          ]);
          return next(error);
        }
        return next(err);
      }
      next();
    });
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Request logging middleware (comprehensive request/response tracking)
  app.use(loggingMiddleware);

  // 7. Authentication middleware will be applied per-route as needed
  // 8. Audit context middleware (for database session variables)
  app.use(auditContextMiddleware);

  // 9. Metrics collection middleware (for monitoring)
  app.use(metricsMiddleware);

  // API Documentation (Swagger UI) - only in development
  if (appConfig.env === 'development') {
    // Serve OpenAPI spec as JSON
    app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Serve Swagger UI
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

    logger.info('Swagger UI available at /api-docs', {
      environment: appConfig.env,
      port: appConfig.port,
    });
  }

  // 10. API route handlers
  app.use('/', healthRouter);
  app.use('/api/v1', metricsRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1', auditRouter);

  // 11. 404 not found handler (must come after all routes)
  app.use(notFoundHandler);

  // 12. Global error handler (MUST be last middleware)
  app.use(errorHandler);

  return app;
};

export default createApp;

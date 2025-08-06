import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';

// Import middleware and configuration
import { requestIdMiddleware } from './middleware/requestId';
import { ValidationError, errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { config as appConfig } from './config/env';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';

// Import routes
import healthRouter from './routes/health';

// Load environment variables
config();

export const createApp = (): express.Application => {
  const app = express();

  // Trust proxy for accurate client IP addresses
  app.set('trust proxy', 1);

  // Security middleware - helmet should be first
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for industrial UIs
      frameguard: { action: 'deny' }, // Explicitly set X-Frame-Options to DENY
    })
  );

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: appConfig.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  };
  app.use(cors(corsOptions));

  // Compression middleware
  app.use(
    compression({
      level: 6,
      threshold: 1024, // Only compress responses > 1KB
      filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter
        return compression.filter(req, res);
      },
    })
  );

  // Request parsing middleware with error handling
  app.use((req, res, next) => {
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        // Store raw body for webhook verification if needed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).rawBody = buf;
      },
    })(req, res, err => {
      if (err) {
        // Handle JSON parsing errors
        if (err.type === 'entity.parse.failed') {
          const error = new ValidationError('Invalid JSON format', {
            body: err.body?.substring(0, 100), // Only include first 100 chars
          });
          return next(error);
        }
        return next(err);
      }
      next();
    });
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID middleware for tracing
  app.use(requestIdMiddleware);

  // Request logging middleware
  app.use((req, _res, next) => {
    const start = Date.now();

    _res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        // requestId: (req as { id?: string }).id,
        method: req.method,
        url: req.originalUrl,
        statusCode: _res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    });

    next();
  });

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

  // API routes
  app.use('/', healthRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;

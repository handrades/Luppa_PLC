import 'reflect-metadata';
import { createApp } from './app';
import { logger } from './config/logger';
import { config, validateEnvironment } from './config/env';
import { closeDatabase, initializeDatabase } from './config/database';
import { closeRedis, initializeRedis } from './config/redis';
import { Server } from 'http';

// Validate environment variables early
validateEnvironment();

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// Create Express application
const app = createApp();
let server: Server;

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize Redis connection
    await initializeRedis();
    logger.info('Redis initialized successfully');

    server = app.listen(config.port, config.host, () => {
      logger.info('Server started successfully', {
        port: config.port,
        host: config.host,
        environment: config.env,
        processId: process.pid,
        nodeVersion: process.version,
      });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else if (error.code === 'EACCES') {
        logger.error(`Permission denied to bind to port ${config.port}`);
      } else {
        logger.error('Server error', {
          error: error.message,
          code: error.code,
        });
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  if (server) {
    server.close(error => {
      if (error) {
        logger.error('Error during server close', { error: error.message });
        process.exit(1);
      }

      logger.info('HTTP server closed');

      // Close database and Redis connections, cleanup resources, etc.
      Promise.all([closeDatabase(), closeRedis()])
        .then(() => {
          logger.info('Database and Redis connections closed');
          process.exit(0);
        })
        .catch(error => {
          logger.error('Error closing connections', {
            error: error.message,
          });
          process.exit(1);
        });
    });

    // Force close after timeout
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000); // 10 seconds timeout
  } else {
    process.exit(0);
  }
};

// Register graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer().catch(error => {
  logger.error('Fatal error during server startup', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});

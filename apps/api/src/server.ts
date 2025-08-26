import 'dotenv/config';
import 'reflect-metadata';
import { Server } from 'http';

console.log('Server.ts: Starting imports...');

import { createApp } from './app';
import { logger } from './config/logger';
import { config, validateEnvironment } from './config/env';
import { closeDatabase } from './config/database';
import { closeRedis, initializeRedis } from './config/redis';

console.log('Server.ts: Imports completed');

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
console.log('Server.ts: Creating app...');
const app = createApp();
console.log('Server.ts: App created');
let server: Server;

// Start server
const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting server...');

    // Initialize database with timeout
    logger.info('Initializing database connection...');
    const { initializeDatabase } = await import('./config/database');

    // Add a timeout to prevent hanging
    const dbInitPromise = initializeDatabase();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Database initialization timed out after 10 seconds')),
        10000
      )
    );

    try {
      await Promise.race([dbInitPromise, timeoutPromise]);
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue without database for now
      logger.warn('Starting server without database connection');
    }

    // Initialize Redis (this works)
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

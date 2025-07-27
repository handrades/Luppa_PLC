import { createApp } from './app';
import { logger } from './config/logger';
import { Server } from 'http';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});

// Create Express application
const app = createApp();
let server: Server;

// Start server
const startServer = async (): Promise<void> => {
  try {
    server = app.listen(PORT, HOST, () => {
      logger.info('Server started successfully', {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        processId: process.pid,
        nodeVersion: process.version
      });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        logger.error(`Permission denied to bind to port ${PORT}`);
      } else {
        logger.error('Server error', { error: error.message, code: error.code });
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  if (server) {
    server.close((error) => {
      if (error) {
        logger.error('Error during server close', { error: error.message });
        process.exit(1);
      }

      logger.info('HTTP server closed');
      
      // Close database connections, cleanup resources, etc.
      // For now, just exit gracefully
      process.exit(0);
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
startServer().catch((error) => {
  logger.error('Fatal error during server startup', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

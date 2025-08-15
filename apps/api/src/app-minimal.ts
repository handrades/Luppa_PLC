import express, { Application } from 'express';
import { logger } from './config/logger';
import { corsMiddleware } from './middleware/corsMiddleware';

export function createApp(): Application {
  const app = express();

  // Add CORS middleware to handle preflight requests
  app.use(corsMiddleware);

  // Add JSON body parsing middleware
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.post('/auth/login', (_req, res) => {
    logger.info('Login request received');
    res.json({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      user: {
        id: '1',
        email: 'admin@luppa.local',
        firstName: 'Admin',
        lastName: 'User',
        roleId: '1',
        roleName: 'Admin',
        permissions: [],
        isActive: true,
        lastLogin: null,
      },
    });
  });

  return app;
}

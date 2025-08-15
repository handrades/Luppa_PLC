import express from 'express';
import { logger } from './config/logger';

const app = express();
const port = 3010;

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

app.listen(port, '0.0.0.0', () => {
  logger.info(`Test server running on port ${port}`);
});

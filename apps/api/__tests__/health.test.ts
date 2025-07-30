import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

// Mock database health check for health endpoint tests
jest.mock('../src/config/database', () => ({
  isDatabaseHealthy: jest.fn().mockResolvedValue(true),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined)
}));

describe('Health Endpoint', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should return correct health response format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status');
    });

    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return connected database status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.database.status).toBe('connected');
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify it's a recent timestamp (within last 5 seconds)
      const timestampDate = new Date(timestamp);
      const now = new Date();
      expect(now.getTime() - timestampDate.getTime()).toBeLessThan(5000);
    });

    it('should return version from package.json', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.version).toBe('1.0.0');
    });

    it('should return test environment', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.environment).toBe('test');
    });

    it('should return numeric uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should accept custom request ID from header', async () => {
      const customRequestId = 'test-request-id-123';
      
      const response = await request(app)
        .get('/health')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });
});

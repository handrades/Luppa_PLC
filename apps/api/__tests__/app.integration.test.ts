import request from 'supertest';
import { createApp } from '../src/app';
import type { Express } from 'express';

// Mock database health check for integration tests
jest.mock('../src/config/database', () => ({
  isDatabaseHealthy: jest.fn().mockResolvedValue(true),
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined)
}));

describe('Application Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('Application Setup', () => {
    it('should create Express application successfully', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should have middleware configured correctly', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Verify multiple middleware are working together
      expect(response.headers).toHaveProperty('x-request-id'); // Request ID middleware
      expect(response.headers).toHaveProperty('x-content-type-options'); // Helmet middleware
      expect(response.body).toHaveProperty('status'); // Route handler
    });
  });

  describe('Request Flow', () => {
    it('should handle complete request lifecycle', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'test-agent')
        .set('X-Request-ID', 'integration-test-123')
        .expect(200);

      const endTime = Date.now();
      
      // Verify response structure
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.environment).toBe('test');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.database.status).toBe('connected');
      
      // Verify headers
      expect(response.headers['x-request-id']).toBe('integration-test-123');
      expect(response.headers['content-type']).toContain('application/json');
      
      // Verify response time is reasonable
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/health')
          .set('X-Request-ID', `concurrent-test-${i}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.headers['x-request-id']).toBe(`concurrent-test-${index}`);
      });
    });
  });

  describe('Security Headers', () => {
    it('should include all required security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-download-options',
        'strict-transport-security',
        'x-permitted-cross-domain-policies'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers).toHaveProperty(header);
      });
    });

    it('should set Content-Security-Policy header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed JSON requests gracefully', async () => {
      const response = await request(app)
        .post('/health') // POST to GET-only endpoint with malformed JSON
        .send('{ malformed json }')
        .set('Content-Type', 'application/json')
        .expect(400); // Should be 400 for malformed JSON (happens before routing)

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid JSON format');
      expect(response.body.error.requestId).toBeDefined();
    });

    it('should handle large request bodies', async () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB of data
      
      const response = await request(app)
        .post('/nonexistent')
        .send({ data: largeData })
        .set('Content-Type', 'application/json')
        .expect(404); // Should handle large body then return 404

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle requests with no Content-Type', async () => {
      const response = await request(app)
        .post('/nonexistent')
        .send('raw data')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = process.hrtime.bigint();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      expect(durationMs).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle rapid successive requests', async () => {
      const promises = [];
      const requestCount = 50;
      
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(requestCount);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy');
      });
    });
  });
});

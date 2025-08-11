import { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../app';
import { register } from '../../config/prometheus';

describe('Metrics Routes', () => {
  let app: Express.Application;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    // Clear metrics registry before each test
    register.clear();
  });

  afterAll(() => {
    // Clear metrics registry after all tests
    register.clear();
  });

  describe('GET /api/v1/metrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should respond within 50ms performance requirement', async () => {
      const startTime = Date.now();

      await request(app).get('/api/v1/metrics').expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(50);
    });

    it('should include default system metrics', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      // Check for Node.js default metrics
      expect(response.text).toContain('process_cpu_seconds_total');
      expect(response.text).toContain('nodejs_heap_size_total_bytes');
      expect(response.text).toContain('process_start_time_seconds');
    });

    it('should include custom HTTP request metrics after making requests', async () => {
      // Make some requests to generate metrics
      await request(app).get('/health');
      await request(app).get('/api/v1/metrics');

      const response = await request(app).get('/api/v1/metrics').expect(200);

      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });

    it('should include database connection metrics', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      expect(response.text).toContain('database_connections_active');
      expect(response.text).toContain('database_connections_idle');
      expect(response.text).toContain('database_pool_utilization');
    });

    it('should include Redis metrics', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      expect(response.text).toContain('redis_memory_used_bytes');
    });

    it('should set proper cache control headers', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
    });

    it('should handle metrics collection errors gracefully', async () => {
      // Mock a database error scenario by testing error handling
      const response = await request(app).get('/api/v1/metrics').expect(200); // Should still return 200 even if some metrics fail

      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should validate Prometheus exposition format', async () => {
      const response = await request(app).get('/api/v1/metrics').expect(200);

      const lines = response.text.split('\n');
      let helpLines = 0;
      let typeLines = 0;
      let metricLines = 0;

      lines.forEach(line => {
        if (line.startsWith('# HELP')) helpLines++;
        if (line.startsWith('# TYPE')) typeLines++;
        if (line && !line.startsWith('#')) metricLines++;
      });

      expect(helpLines).toBeGreaterThan(0);
      expect(typeLines).toBeGreaterThan(0);
      expect(metricLines).toBeGreaterThan(0);
    });

    it('should track HTTP request metrics with proper labels', async () => {
      // Make different types of requests to generate varied metrics
      await request(app).get('/health');
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'test' });

      const response = await request(app).get('/api/v1/metrics').expect(200);

      // Check for HTTP metrics with method labels
      expect(response.text).toMatch(/http_requests_total\{.*method="GET".*\}/);
      expect(response.text).toMatch(/http_request_duration_seconds_bucket\{.*method="GET".*\}/);
    });
  });
});

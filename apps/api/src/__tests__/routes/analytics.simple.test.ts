import request from 'supertest';
import express from 'express';
import analyticsRouter from '../../routes/analytics';
import analyticsService from '../../services/AnalyticsService';

jest.mock('../../services/AnalyticsService');
jest.mock('../../config/logger');
interface MockRequest {
  user?: { id: string; username: string };
}

type MockNext = () => void;
type MockResponse = unknown;

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: MockRequest, _res: MockResponse, next: MockNext) => {
    req.user = { id: 'test-user', username: 'testuser' };
    next();
  },
  authorize: () => (_req: MockRequest, _res: MockResponse, next: MockNext) => next(),
}));

describe('Analytics Routes - Simple Test', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/analytics', analyticsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/analytics/overview', () => {
    it('should return dashboard overview data', async () => {
      const mockOverview = {
        totalEquipment: 100,
        totalPLCs: 200,
        totalSites: 10,
        totalCells: 50,
        weeklyTrend: { percentage: 5.5, direction: 'up' },
        lastUpdated: new Date(),
      };

      (analyticsService.getEquipmentOverview as jest.Mock).mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEquipment).toBe(100);
      expect(response.body.data.totalPLCs).toBe(200);
    });
  });

  describe('GET /api/v1/analytics/distribution/:type', () => {
    it('should return distribution by site', async () => {
      const mockDistribution = {
        labels: ['Site A', 'Site B'],
        values: [100, 75],
        percentages: [57.1, 42.9],
        colors: ['#0088FE', '#00C49F'],
      };

      (analyticsService.getDistributionBySite as jest.Mock).mockResolvedValue(mockDistribution);

      const response = await request(app)
        .get('/api/v1/analytics/distribution/site');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.labels).toEqual(['Site A', 'Site B']);
    });

    it('should reject invalid distribution type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/distribution/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/analytics/top-models', () => {
    it('should return top models', async () => {
      const mockTopModels = [
        { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
        { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
      ];

      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);

      const response = await request(app)
        .get('/api/v1/analytics/top-models');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(analyticsService.getTopModels).toHaveBeenCalledWith(10);
    });
  });

  describe('POST /api/v1/analytics/export', () => {
    it('should prepare export data', async () => {
      const mockOverview = {
        totalEquipment: 100,
        totalPLCs: 200,
        totalSites: 10,
        totalCells: 50,
        weeklyTrend: { percentage: 5.5, direction: 'up' },
        lastUpdated: new Date(),
      };

      (analyticsService.getEquipmentOverview as jest.Mock).mockResolvedValue(mockOverview);

      const response = await request(app)
        .post('/api/v1/analytics/export')
        .send({
          format: 'pdf',
          sections: ['overview'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('metadata');
    });
  });
});

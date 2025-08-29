// Create the mock service instance
const mockAnalyticsService = {
  getEquipmentOverview: jest.fn(),
  getDistributionBySite: jest.fn(),
  getDistributionByMake: jest.fn(),
  getDistributionByType: jest.fn(),
  getTopModels: jest.fn(),
  getHierarchyStatistics: jest.fn(),
  getRecentActivity: jest.fn(),
  clearCache: jest.fn(),
};

// Mock the AnalyticsService singleton - must be hoisted before imports
jest.mock('../../services/AnalyticsService', () => {
  return {
    __esModule: true,
    default: mockAnalyticsService,
    AnalyticsService: jest.fn(),
  };
});
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((_req, _res, next) => next()),
  authorize: jest.fn(() => (_req, _res, next) => next()),
}));
jest.mock('../../config/logger');

import request from 'supertest';
import express, { Express, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import analyticsRouter from '../../routes/analytics';

interface MockRequest extends Request {
  user?: { id: string; username: string; roles: string[] };
}

describe('Analytics Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (authenticate as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'test-user', username: 'testuser', roles: ['admin'] };
      next();
    });
    
    (authorize as jest.Mock).mockImplementation(() => (_req: MockRequest, _res: Response, next: () => void) => next());
    
    // Create a simple test app with only the analytics router
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

      mockAnalyticsService.getEquipmentOverview.mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', 'Bearer test-token');

      // Include response body in assertion message for debugging
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expect.objectContaining({
        totalEquipment: 100,
        totalPLCs: 200,
        totalSites: 10,
        totalCells: 50,
      }));
      expect(response.headers['cache-control']).toBe('public, max-age=60');
    });

    it('should handle service errors', async () => {
      mockAnalyticsService.getEquipmentOverview.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/v1/analytics/distribution/:type', () => {
    const mockDistribution = {
      labels: ['Site A', 'Site B', 'Site C'],
      values: [100, 75, 50],
      percentages: [44.4, 33.3, 22.2],
      colors: ['#0088FE', '#00C49F', '#FFBB28'],
    };

    it('should return distribution by site', async () => {
      mockAnalyticsService.getDistributionBySite.mockResolvedValue(mockDistribution);

      const response = await request(app)
        .get('/api/v1/analytics/distribution/site')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDistribution);
    });

    it('should return distribution by make', async () => {
      mockAnalyticsService.getDistributionByMake.mockResolvedValue(mockDistribution);

      const response = await request(app)
        .get('/api/v1/analytics/distribution/make')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.getDistributionByMake).toHaveBeenCalled();
    });

    it('should return distribution by equipment type', async () => {
      mockAnalyticsService.getDistributionByType.mockResolvedValue(mockDistribution);

      const response = await request(app)
        .get('/api/v1/analytics/distribution/equipment_type')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.getDistributionByType).toHaveBeenCalled();
    });

    it('should reject invalid distribution type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/distribution/invalid')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid distribution type');
    });
  });

  describe('GET /api/v1/analytics/top-models', () => {
    const mockTopModels = [
      { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
      { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
      { make: 'Omron', model: 'CJ2M', count: 20, percentage: 20 },
    ];

    it('should return top models with default limit', async () => {
      mockAnalyticsService.getTopModels.mockResolvedValue(mockTopModels);

      const response = await request(app)
        .get('/api/v1/analytics/top-models')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockTopModels);
      expect(mockAnalyticsService.getTopModels).toHaveBeenCalledWith(10);
    });

    it('should accept custom limit', async () => {
      mockAnalyticsService.getTopModels.mockResolvedValue(mockTopModels);

      const response = await request(app)
        .get('/api/v1/analytics/top-models?limit=20')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockAnalyticsService.getTopModels).toHaveBeenCalledWith(20);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/top-models?limit=100')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be less than or equal to 50');
    });
  });

  describe('GET /api/v1/analytics/hierarchy', () => {
    const mockHierarchy = [
      {
        id: 'site1',
        name: 'Site 1',
        type: 'site',
        count: 15,
        children: [
          { id: 'cell1', name: 'Cell 1', type: 'cell', count: 8 },
          { id: 'cell2', name: 'Cell 2', type: 'cell', count: 7 },
        ],
      },
    ];

    it('should return hierarchy statistics', async () => {
      mockAnalyticsService.getHierarchyStatistics.mockResolvedValue(mockHierarchy);

      const response = await request(app)
        .get('/api/v1/analytics/hierarchy')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockHierarchy);
    });
  });

  describe('GET /api/v1/analytics/recent-activity', () => {
    const mockActivities = [
      {
        id: 'act1',
        action: 'create',
        entityType: 'plc',
        entityName: 'PLC-001',
        userId: 'user1',
        userName: 'John Doe',
        timestamp: new Date(),
      },
    ];

    it('should return recent activities with pagination', async () => {
      mockAnalyticsService.getRecentActivity.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/v1/analytics/recent-activity')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([
        {
          ...mockActivities[0],
          timestamp: mockActivities[0].timestamp.toISOString(),
        },
      ]);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        hasMore: false,
      });
      expect(mockAnalyticsService.getRecentActivity).toHaveBeenCalledWith(20, 0);
    });

    it('should accept pagination parameters', async () => {
      mockAnalyticsService.getRecentActivity.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/v1/analytics/recent-activity?limit=50&page=2')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(50);
      expect(mockAnalyticsService.getRecentActivity).toHaveBeenCalledWith(50, 50);
    });
  });

  describe('POST /api/v1/analytics/export', () => {
    it('should prepare export data for requested sections', async () => {
      const mockOverview = {
        totalEquipment: 100,
        totalPLCs: 200,
        totalSites: 10,
        totalCells: 50,
        weeklyTrend: { percentage: 5.5, direction: 'up' },
        lastUpdated: new Date(),
      };

      mockAnalyticsService.getEquipmentOverview.mockResolvedValue(mockOverview);
      mockAnalyticsService.getDistributionBySite.mockResolvedValue({
        labels: ['Site A'],
        values: [100],
        percentages: [100],
        colors: ['#0088FE'],
      });

      const response = await request(app)
        .post('/api/v1/analytics/export')
        .set('Authorization', 'Bearer test-token')
        .send({
          format: 'pdf',
          sections: ['overview', 'distribution'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('distribution');
      expect(response.body.data).toHaveProperty('metadata');
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/export')
        .set('Authorization', 'Bearer test-token')
        .send({
          format: 'excel',
          sections: ['overview'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be [pdf]');
    });

    it('should require at least one section', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/export')
        .set('Authorization', 'Bearer test-token')
        .send({
          format: 'pdf',
          sections: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must contain at least 1 items');
    });
  });

  describe('POST /api/v1/analytics/cache/clear', () => {
    it('should clear analytics cache', async () => {
      mockAnalyticsService.clearCache.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/analytics/cache/clear')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Analytics cache cleared successfully');
      expect(mockAnalyticsService.clearCache).toHaveBeenCalled();
    });

    it.skip('should require admin role', async () => {
      // Create a new app instance with restricted authorize mock
      (authorize as jest.Mock).mockImplementation(() => (_req: MockRequest, res: Response) => {
        res.status(403).json({ error: 'Insufficient permissions' });
      });
      
      // Create a simple test app with analytics router
      const restrictedApp = express();
      restrictedApp.use(express.json());
      restrictedApp.use('/api/v1/analytics', analyticsRouter);

      const response = await request(restrictedApp)
        .post('/api/v1/analytics/cache/clear')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });
  });
});

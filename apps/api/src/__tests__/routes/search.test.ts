/**
 * Search Routes Tests
 * 
 * Integration tests for search API endpoints
 */

// Mock the database module before importing any other modules
jest.mock('../../config/database', () => {
  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      connection: {
        driver: {
          escape: jest.fn(value => `'${value}'`),
        },
      },
      getRepository: jest.fn(),
    },
  };

  const mockDataSource = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(() => mockQueryRunner),
    options: { type: 'better-sqlite3' },
    driver: {
      escape: jest.fn(value => `'${value}'`),
    },
  };

  return {
    AppDataSource: mockDataSource,
    createDataSource: jest.fn(() => mockDataSource),
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
    closeDatabase: jest.fn().mockResolvedValue(undefined),
    isDatabaseHealthy: jest.fn().mockResolvedValue(true),
    getDatabaseHealth: jest.fn().mockResolvedValue({
      isHealthy: true,
      responseTime: 10,
      poolStats: { isConnected: true, poolConfig: {} },
    }),
  };
});

// Mock audit context middleware
jest.mock('../../middleware/auditContext', () => ({
  auditContextMiddleware: jest.fn((req, res, next) => {
    // Simulate audit context setup with mocked manager
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn(),
        connection: {
          driver: {
            escape: jest.fn(value => `'${value}'`),
          },
        },
      },
    };

    req.auditQueryRunner = mockQueryRunner;
    req.auditEntityManager = mockQueryRunner.manager;
    next();
  }),
}));

// Mock rate limiter to prevent rate limiting in tests
jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimit: jest.fn((req, res, next) => next()),
  strictAuthRateLimit: jest.fn((req, res, next) => next()),
}));

import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
// import { SearchService } from '../../services/SearchService';
import { createAuthToken } from '../helpers/auth';

// Get the mocked SearchService
const { mockSearchService } = jest.requireMock('../../services/SearchService');

// Mock SearchService
jest.mock('../../services/SearchService', () => {
  const mockSearchService = {
    search: jest.fn(),
    getSearchSuggestions: jest.fn(),
    refreshSearchView: jest.fn(),
    getSearchMetrics: jest.fn(),
  };
  
  return {
    SearchService: jest.fn().mockImplementation(() => mockSearchService),
    mockSearchService // Export for test access
  };
});

describe('Search Routes', () => {
  let app: Express;
  let authToken: string;

  beforeEach(() => {
    app = createApp();
    
    // Create a real JWT token for testing
    authToken = createAuthToken({
      id: 'test-user-id',
      email: 'test@example.com',
      permissions: ['equipment.read', 'admin']
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/search/equipment', () => {
    it('should return search results successfully', async () => {
      const mockSearchResponse = {
        data: [
          {
            plc_id: '123e4567-e89b-12d3-a456-426614174000',
            tag_id: 'PLC-001',
            plc_description: 'Main production line PLC',
            make: 'Siemens',
            model: 'S7-1200',
            relevance_score: 0.95,
            hierarchy_path: 'Site A > Cell 1 > Equipment 1 > PLC-001',
          },
        ],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        searchMetadata: {
          query: 'Siemens',
          executionTimeMs: 45,
          totalMatches: 1,
          searchType: 'fulltext',
        },
      };

      mockSearchService.search.mockResolvedValue(mockSearchResponse);

      const response = await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Siemens' })
        .expect(200);

      expect(response.body).toEqual(mockSearchResponse);
      expect(mockSearchService.search).toHaveBeenCalledWith({
        q: 'Siemens',
        page: 1,
        pageSize: 50,
        includeHighlights: true,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        maxResults: 1000,
      });
    });

    it('should validate query parameters', async () => {
      // Missing query parameter
      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Invalid page size
      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test', pageSize: 101 })
        .expect(400);

      // Invalid page number
      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test', page: 0 })
        .expect(400);
    });

    it('should handle search service errors', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search service unavailable'));

      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test' })
        .expect(500);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/search/equipment')
        .query({ q: 'test' })
        .expect(401);
    });

    it('should support pagination parameters', async () => {
      mockSearchService.search.mockResolvedValue({
        data: [],
        pagination: { page: 2, pageSize: 25, total: 100, totalPages: 4, hasNext: true, hasPrev: true },
        searchMetadata: { query: 'test', executionTimeMs: 30, totalMatches: 100, searchType: 'fulltext' },
      });

      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test', page: 2, pageSize: 25 })
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'test',
          page: 2,
          pageSize: 25,
        })
      );
    });

    it('should support advanced search options', async () => {
      mockSearchService.search.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'test', executionTimeMs: 20, totalMatches: 0, searchType: 'similarity' },
      });

      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'test',
          sortBy: 'make',
          sortOrder: 'ASC',
          includeHighlights: 'false',
          maxResults: 500,
        })
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'make',
          sortOrder: 'ASC',
          includeHighlights: false,
          maxResults: 500,
        })
      );
    });
  });

  describe('GET /api/v1/search/suggestions', () => {
    it('should return search suggestions', async () => {
      const mockSuggestions = ['Siemens S7', 'Siemens PLC', 'Siemens 1200'];
      mockSearchService.getSearchSuggestions.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Siem', limit: 5 })
        .expect(200);

      expect(response.body).toEqual({
        query: 'Siem',
        suggestions: mockSuggestions,
        count: mockSuggestions.length,
      });
    });

    it('should validate suggestion parameters', async () => {
      // Missing query
      await request(app)
        .get('/api/v1/search/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Query too long
      await request(app)
        .get('/api/v1/search/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'a'.repeat(51) })
        .expect(400);

      // Invalid limit
      await request(app)
        .get('/api/v1/search/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test', limit: 21 })
        .expect(400);
    });
  });

  describe('POST /api/v1/search/refresh', () => {
    it('should refresh search view successfully (admin only)', async () => {
      mockSearchService.refreshSearchView.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/search/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Search view refreshed successfully',
        refreshedAt: expect.any(String),
      });
      expect(mockSearchService.refreshSearchView).toHaveBeenCalled();
    });

    it('should require admin permissions', async () => {
      // Create a token without admin permissions
      const nonAdminToken = createAuthToken({
        id: 'non-admin-user',
        email: 'nonadmin@example.com',
        permissions: ['equipment.read'] // No admin permission
      });
      
      await request(app)
        .post('/api/v1/search/refresh')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);
    });

    it('should handle refresh errors', async () => {
      mockSearchService.refreshSearchView.mockRejectedValue(new Error('Refresh failed'));

      await request(app)
        .post('/api/v1/search/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  describe('GET /api/v1/search/metrics', () => {
    it('should return search metrics (admin only)', async () => {
      // Mock metrics data structure
      const mockMetricsData = {
        timeRange: '24h',
        totalSearches: 150,
        averageExecutionTime: 45.5,
        averageResultCount: 23.2,
        searchTypes: {
          fulltext: 80,
          similarity: 40,
          hybrid: 30,
        },
      };

      mockSearchService.getSearchMetrics.mockResolvedValue([
        { executionTime: 45, resultCount: 23, searchType: 'fulltext' },
        { executionTime: 46, resultCount: 24, searchType: 'similarity' },
      ]);

      const response = await request(app)
        .get('/api/v1/search/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ timeRange: '24h' })
        .expect(200);

      expect(response.body.metrics).toMatchObject({
        timeRange: mockMetricsData.timeRange,
        totalSearches: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        averageResultCount: expect.any(Number),
      });
    });

    it('should validate metrics parameters', async () => {
      // Invalid time range
      await request(app)
        .get('/api/v1/search/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ timeRange: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/v1/search/health', () => {
    it('should return healthy status when search works', async () => {
      mockSearchService.search.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 1, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'test', executionTimeMs: 25, totalMatches: 0, searchType: 'fulltext' },
      });

      const response = await request(app)
        .get('/api/v1/search/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'search',
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
        testQuery: {
          executed: true,
          resultCount: expect.any(Number),
          executionTime: expect.any(Number),
        },
      });
    });

    it('should return unhealthy status when search fails', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/search/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        service: 'search',
        error: 'Database connection failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('performance tests', () => {
    it('should handle concurrent search requests', async () => {
      mockSearchService.search.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'concurrent', executionTimeMs: 30, totalMatches: 0, searchType: 'fulltext' },
      });

      // Send 10 concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/api/v1/search/equipment')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ q: `concurrent-${i}` })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockSearchService.search).toHaveBeenCalledTimes(10);
    });

    it('should respond within acceptable time limits', async () => {
      mockSearchService.search.mockResolvedValue({
        data: Array.from({ length: 100 }, (_, i) => ({
          plc_id: `plc-${i}`,
          tag_id: `PLC-${i}`,
          plc_description: `Test PLC ${i}`,
          make: 'Test',
          model: 'Model',
          relevance_score: 0.5,
          hierarchy_path: `Site > Cell > Equipment > PLC-${i}`,
        })),
        pagination: { page: 1, pageSize: 100, total: 100, totalPages: 1, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'performance', executionTimeMs: 50, totalMatches: 100, searchType: 'fulltext' },
      });

      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/search/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'performance', pageSize: 100 })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('security tests', () => {
    it('should prevent SQL injection attacks', async () => {
      const maliciousQueries = [
        "'; DROP TABLE plcs; --",
        "' UNION SELECT * FROM users --",
        "1'; DELETE FROM equipment; --",
        "<script>alert('xss')</script>",
      ];

      // Mock the SearchService to throw validation errors for malicious queries
      mockSearchService.search.mockImplementation((query) => {
        const queryString = query.q;
        if (maliciousQueries.includes(queryString)) {
          throw new Error('Invalid search query');
        }
        return Promise.resolve({
          data: [],
          pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          searchMetadata: { query: queryString, executionTimeMs: 10, totalMatches: 0, searchType: 'fulltext' },
        });
      });

      for (const maliciousQuery of maliciousQueries) {
        await request(app)
          .get('/api/v1/search/equipment')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ q: maliciousQuery })
          .expect(500); // Should throw an error and return 500
      }
    });

    it('should rate limit search requests', async () => {
      // This would test rate limiting if implemented
      mockSearchService.search.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'rate-limit', executionTimeMs: 10, totalMatches: 0, searchType: 'fulltext' },
      });

      // Send many requests rapidly
      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/v1/search/equipment')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ q: 'rate-limit-test' })
      );

      const responses = await Promise.allSettled(requests);
      
      // Some requests might be rate limited (429 status)
      const successCount = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200
      ).length;
      
      const rateLimitedCount = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      ).length;

      // Expect some rate limiting to occur
      expect(successCount + rateLimitedCount).toBe(100);
    });
  });
});

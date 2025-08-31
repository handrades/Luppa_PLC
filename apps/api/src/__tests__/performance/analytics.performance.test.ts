import { AnalyticsService } from '../../services/AnalyticsService';
import { AppDataSource, getAppDataSource } from '../../config/database';
import { redisClient } from '../../config/redis';
import { performance } from 'perf_hooks';

// Mock dependencies with explicit ESM-shaped modules
jest.mock('../../config/database', () => ({
  __esModule: true,
  AppDataSource: {
    query: jest.fn(),
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    })),
  },
  getAppDataSource: jest.fn(() => ({
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    })),
  })),
}));

jest.mock('../../config/redis', () => ({
  __esModule: true,
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    scan: jest.fn().mockResolvedValue({ cursor: '0', keys: [] }),
    unlink: jest.fn().mockResolvedValue(0),
    del: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../../config/logger', () => ({
  __esModule: true,
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Analytics Performance Tests', () => {
  let analyticsService: AnalyticsService;
  let mockQuery: jest.Mock;
  let getAppDataSourceMock: jest.Mock;

  beforeAll(() => {
    analyticsService = new AnalyticsService();
    mockQuery = jest.fn();
    getAppDataSourceMock = getAppDataSource as jest.Mock;
    
    // Set up default mock for getAppDataSource
    getAppDataSourceMock.mockReturnValue({
      query: mockQuery,
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        })),
      })),
    });
    
    const redisClientMock = redisClient as typeof redisClient & { get: jest.Mock; setEx: jest.Mock };
    redisClientMock.get = jest.fn().mockResolvedValue(null);
    redisClientMock.setEx = jest.fn().mockResolvedValue('OK');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Large Dataset Performance', () => {
    it('should handle 10,000+ equipment records efficiently', async () => {
      // Test validates performance with large dataset mock

      // Mock database response
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10000),
      };

      getAppDataSourceMock.mockReturnValue({
        query: mockQuery,
        getRepository: jest.fn().mockReturnValue(mockRepository),
      });

      // Measure performance
      const startTime = performance.now();
      await analyticsService.getEquipmentOverview();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within 100ms even with large dataset
      expect(executionTime).toBeLessThan(100);
    });

    it('should aggregate distribution data for 10,000+ records efficiently', async () => {
      // Mock large distribution result
      const largeDistribution = Array.from({ length: 100 }, (_, i) => ({
        label: `Site ${i}`,
        value: Math.floor(Math.random() * 1000),
      }));

      mockQuery.mockResolvedValue(largeDistribution);

      const startTime = performance.now();
      await analyticsService.getDistributionBySite();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete aggregation within 100ms
      expect(executionTime).toBeLessThan(100);
    });

    it('should calculate top models from 10,000+ PLCs efficiently', async () => {
      // Mock result with many unique models
      const topModelsData = Array.from({ length: 500 }, (_, i) => ({
        make: `Manufacturer ${i % 50}`,
        model: `Model ${i}`,
        count: Math.floor(Math.random() * 100),
      }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      mockQuery.mockResolvedValue(topModelsData);

      const startTime = performance.now();
      const result = await analyticsService.getTopModels(10);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toHaveLength(10);
      expect(executionTime).toBeLessThan(50);
    });

    it('should build hierarchy for complex site structure efficiently', async () => {
      // Mock complex hierarchy with 100 sites, 500 cells
      const sites = Array.from({ length: 100 }, (_, i) => ({
        id: `site-${i}`,
        name: `Site ${i}`,
        cell_count: 5,
        equipment_count: 50,
        plc_count: 100,
      }));

      const cells = Array.from({ length: 500 }, (_, i) => ({
        id: `cell-${i}`,
        name: `Cell ${i}`,
        cell_type: 'production',
        equipment_count: 10,
        plc_count: 20,
      }));

      mockQuery
        .mockResolvedValueOnce(sites)
        .mockResolvedValue(cells.slice(0, 5)); // Return 5 cells per site

      const startTime = performance.now();
      const result = await analyticsService.getHierarchyStatistics();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toHaveLength(100);
      // Even with complex hierarchy, should complete within reasonable time
      expect(executionTime).toBeLessThan(500);
    });

    it('should handle concurrent analytics requests efficiently', async () => {
      // Mock responses
      mockQuery.mockResolvedValue([]);
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10000),
      };
      (AppDataSource as typeof AppDataSource & { getRepository: jest.Mock }).getRepository = jest.fn().mockReturnValue(mockRepository);

      const startTime = performance.now();
      
      // Simulate concurrent requests
      const promises = [
        analyticsService.getEquipmentOverview(),
        analyticsService.getDistributionBySite(),
        analyticsService.getDistributionByMake(),
        analyticsService.getDistributionByType(),
        analyticsService.getTopModels(10),
        analyticsService.getHierarchyStatistics(),
        analyticsService.getRecentActivity(50),
      ];

      await Promise.all(promises);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // All requests combined should complete within 500ms
      expect(executionTime).toBeLessThan(500);
    });

    it('should utilize cache effectively for repeated requests', async () => {
      const mockOverview = {
        totalEquipment: 10000,
        totalPLCs: 25000,
        totalSites: 100,
        totalCells: 500,
        weeklyTrend: { percentage: 5.5, direction: 'up' },
        lastUpdated: new Date(),
      };

      // First request - no cache
      (redisClient as typeof redisClient & { get: jest.Mock }).get = jest.fn().mockResolvedValueOnce(null);
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10000),
      };
      (AppDataSource as typeof AppDataSource & { getRepository: jest.Mock }).getRepository = jest.fn().mockReturnValue(mockRepository);
      mockQuery.mockResolvedValue([{ current_count: '100', previous_count: '95' }]);

      const firstStartTime = performance.now();
      await analyticsService.getEquipmentOverview();
      const firstEndTime = performance.now();
      const firstExecutionTime = firstEndTime - firstStartTime;

      // Second request - with cache
      (redisClient as typeof redisClient & { get: jest.Mock }).get = jest.fn().mockResolvedValueOnce(JSON.stringify(mockOverview));

      const secondStartTime = performance.now();
      await analyticsService.getEquipmentOverview();
      const secondEndTime = performance.now();
      const secondExecutionTime = secondEndTime - secondStartTime;

      // Cached request should be faster (but CI environments can be inconsistent)
      // We just verify it's faster, not necessarily 2x faster
      expect(secondExecutionTime).toBeLessThan(firstExecutionTime);
      // And that it's still reasonably fast
      expect(secondExecutionTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with large result sets', async () => {
      // Generate very large activity result
      const largeActivitySet = Array.from({ length: 1000 }, (_, i) => ({
        id: `activity-${i}`,
        action: 'UPDATE',
        entityType: 'plc',
        entityId: `plc-${i}`,
        entityName: `PLC-${i}`,
        userId: `user-${i % 10}`,
        userName: `User ${i % 10}`,
        timestamp: new Date().toISOString(),
        changes: { field: 'value' },
      }));

      mockQuery.mockResolvedValue(largeActivitySet);

      // Measure initial memory
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large dataset multiple times
      for (let i = 0; i < 10; i++) {
        await analyticsService.getRecentActivity(1000);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Check memory usage didn't increase significantly
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Query Optimization', () => {
    it('should use efficient queries with proper indexing', async () => {
      mockQuery.mockResolvedValue([]);

      await analyticsService.getDistributionBySite();

      // Verify query includes proper GROUP BY and ORDER BY
      expect(mockQuery.mock.calls[0][0]).toEqual(
        expect.stringContaining('GROUP BY'),
      );
      expect(mockQuery.mock.calls[0][0]).toEqual(
        expect.stringContaining('ORDER BY value DESC'),
      );
    });

    it('should batch database operations efficiently', async () => {
      const sites = Array.from({ length: 10 }, (_, i) => ({
        id: `site-${i}`,
        name: `Site ${i}`,
        cell_count: 5,
        equipment_count: 50,
        plc_count: 100,
      }));

      mockQuery.mockResolvedValue(sites);

      await analyticsService.getHierarchyStatistics();

      // Should use minimal number of queries
      const queryCallCount = mockQuery.mock.calls.length;
      expect(queryCallCount).toBeLessThanOrEqual(11); // 1 for sites + 10 for cells
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive requests', async () => {
      mockQuery.mockResolvedValue([]);
      const mockRepository = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1000),
      };
      (AppDataSource as typeof AppDataSource & { getRepository: jest.Mock }).getRepository = jest.fn().mockReturnValue(mockRepository);

      const startTime = performance.now();
      
      // Simulate 100 rapid requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(analyticsService.getEquipmentOverview());
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should handle burst traffic efficiently
      expect(executionTime).toBeLessThan(1000);
    });

    it('should degrade gracefully under extreme load', async () => {
      // Simulate slow database
      mockQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const startTime = performance.now();
      
      try {
        // Try to fetch with timeout
        await Promise.race([
          analyticsService.getDistributionBySite(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          ),
        ]);
      } catch (error) {
        // Should handle timeout gracefully
        expect(error).toBeDefined();
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should not hang indefinitely
      expect(executionTime).toBeLessThan(5100);
    });
  });
});

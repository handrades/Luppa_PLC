import { AnalyticsService } from '../../services/AnalyticsService';
import { AppDataSource } from '../../config/database';
import { redisClient } from '../../config/redis';

jest.mock('../../config/database');
jest.mock('../../config/redis');
jest.mock('../../config/logger');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockRepository: {
    createQueryBuilder: jest.Mock;
    where: jest.Mock;
    getCount: jest.Mock;
  };
  let mockQuery: jest.Mock;
  let mockRedisGet: jest.Mock;
  let mockRedisSetEx: jest.Mock;
  let mockRedisDel: jest.Mock;
  let mockRedisScan: jest.Mock;
  let mockRedisUnlink: jest.Mock;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    
    mockQuery = jest.fn();
    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };
    
    mockRedisGet = jest.fn();
    mockRedisSetEx = jest.fn();
    mockRedisDel = jest.fn();
    mockRedisScan = jest.fn();
    mockRedisUnlink = jest.fn();
    
    (AppDataSource.getRepository as jest.Mock) = jest.fn().mockReturnValue(mockRepository);
    (AppDataSource.query as jest.Mock) = mockQuery;
    (redisClient.get as jest.Mock) = mockRedisGet;
    (redisClient.setEx as jest.Mock) = mockRedisSetEx;
    (redisClient.del as jest.Mock) = mockRedisDel;
    (redisClient.scan as jest.Mock) = mockRedisScan;
    (redisClient.unlink as jest.Mock) = mockRedisUnlink;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEquipmentOverview', () => {
    it('should return overview data from cache if available', async () => {
      const cachedData = JSON.stringify({
        totalEquipment: 100,
        totalPLCs: 200,
        totalSites: 10,
        totalCells: 50,
        weeklyTrend: { percentage: 5.5, direction: 'up' },
        lastUpdated: new Date(),
      });

      mockRedisGet.mockResolvedValue(cachedData);

      const result = await analyticsService.getEquipmentOverview();

      expect(mockRedisGet).toHaveBeenCalledWith('analytics:overview');
      expect(result.totalEquipment).toBe(100);
      expect(result.totalPLCs).toBe(200);
      expect(mockRepository.getCount).not.toHaveBeenCalled();
    });

    it('should fetch and cache overview data if not in cache', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRepository.getCount
        .mockResolvedValueOnce(150) // equipment
        .mockResolvedValueOnce(300) // PLCs
        .mockResolvedValueOnce(12)  // sites
        .mockResolvedValueOnce(60); // cells

      mockQuery.mockResolvedValue([
        { current_count: '10', previous_count: '8' }
      ]);

      const result = await analyticsService.getEquipmentOverview();

      expect(mockRepository.getCount).toHaveBeenCalledTimes(4);
      expect(result.totalEquipment).toBe(150);
      expect(result.totalPLCs).toBe(300);
      expect(result.totalSites).toBe(12);
      expect(result.totalCells).toBe(60);
      expect(result.weeklyTrend.percentage).toBe(25);
      expect(result.weeklyTrend.direction).toBe('up');
      expect(mockRedisSetEx).toHaveBeenCalled();
    });

    it('should handle zero previous count in trend calculation', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRepository.getCount.mockResolvedValue(0);
      mockQuery.mockResolvedValue([
        { current_count: '5', previous_count: '0' }
      ]);

      const result = await analyticsService.getEquipmentOverview();

      expect(result.weeklyTrend.percentage).toBe(100);
      expect(result.weeklyTrend.direction).toBe('up');
    });

    it('should handle negative trend', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockRepository.getCount.mockResolvedValue(0);
      mockQuery.mockResolvedValue([
        { current_count: '5', previous_count: '10' }
      ]);

      const result = await analyticsService.getEquipmentOverview();

      expect(result.weeklyTrend.percentage).toBe(50);
      expect(result.weeklyTrend.direction).toBe('down');
    });
  });

  describe('getDistributionBySite', () => {
    it('should return cached distribution data if available', async () => {
      const cachedData = JSON.stringify({
        labels: ['Site A', 'Site B'],
        values: [50, 30],
        percentages: [62.5, 37.5],
        colors: ['#0088FE', '#00C49F'],
      });

      mockRedisGet.mockResolvedValue(cachedData);

      const result = await analyticsService.getDistributionBySite();

      expect(mockRedisGet).toHaveBeenCalledWith('analytics:distribution:site');
      expect(result.labels).toEqual(['Site A', 'Site B']);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should fetch and format distribution data', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        { label: 'Site A', value: '100' },
        { label: 'Site B', value: '50' },
        { label: 'Site C', value: '30' },
      ]);

      const result = await analyticsService.getDistributionBySite();

      expect(result.labels).toEqual(['Site A', 'Site B', 'Site C']);
      expect(result.values).toEqual([100, 50, 30]);
      expect(result.percentages[0]).toBeCloseTo(55.56, 1);
      expect(result.percentages[1]).toBeCloseTo(27.78, 1);
      expect(result.percentages[2]).toBeCloseTo(16.67, 1);
      expect(result.colors).toHaveLength(3);
      expect(mockRedisSetEx).toHaveBeenCalled();
    });
  });

  describe('getTopModels', () => {
    it('should return top models with percentages', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        { make: 'Allen Bradley', model: 'CompactLogix', count: '50' },
        { make: 'Siemens', model: 'S7-1200', count: '30' },
        { make: 'Omron', model: 'CJ2M', count: '20' },
      ]);

      const result = await analyticsService.getTopModels(3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        make: 'Allen Bradley',
        model: 'CompactLogix',
        count: 50,
        percentage: 50,
      });
      expect(result[1].percentage).toBe(30);
      expect(result[2].percentage).toBe(20);
    });

    it('should respect limit parameter', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        { make: 'Make1', model: 'Model1', count: '10' },
        { make: 'Make2', model: 'Model2', count: '8' },
      ]);

      await analyticsService.getTopModels(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('getHierarchyStatistics', () => {
    it('should return hierarchy tree structure', async () => {
      mockRedisGet.mockResolvedValue(null);
      
      // Mock sites query
      mockQuery.mockResolvedValueOnce([
        {
          id: 'site1',
          name: 'Site 1',
          cell_count: '2',
          equipment_count: '10',
          plc_count: '15',
        },
      ]);
      
      // Mock cells query
      mockQuery.mockResolvedValueOnce([
        {
          id: 'cell1',
          name: 'Cell 1',
          cell_type: 'production',
          equipment_count: '5',
          plc_count: '8',
        },
        {
          id: 'cell2',
          name: 'Cell 2',
          cell_type: 'assembly',
          equipment_count: '5',
          plc_count: '7',
        },
      ]);

      const result = await analyticsService.getHierarchyStatistics();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Site 1');
      expect(result[0].type).toBe('site');
      expect(result[0].count).toBe(15);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children![0].name).toBe('Cell 1 (production)');
    });
  });

  describe('getRecentActivity', () => {
    it('should map audit actions correctly', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        {
          id: 'activity1',
          action: 'INSERT',
          entityType: 'plc',
          entityId: 'plc1',
          entityName: 'PLC-001',
          userId: 'user1',
          userName: 'John Doe',
          timestamp: new Date().toISOString(),
          changes: { ip: '192.168.1.1' },
        },
        {
          id: 'activity2',
          action: 'UPDATE',
          entityType: 'equipment',
          entityId: 'eq1',
          entityName: 'Conveyor-01',
          userId: 'user2',
          userName: 'Jane Smith',
          timestamp: new Date().toISOString(),
          changes: { status: 'active' },
        },
      ]);

      const result = await analyticsService.getRecentActivity(20);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('create');
      expect(result[0].entityType).toBe('plc');
      expect(result[1].action).toBe('update');
      expect(result[1].entityType).toBe('equipment');
    });

    it('should handle missing user names', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockQuery.mockResolvedValue([
        {
          id: 'activity1',
          action: 'DELETE',
          entityType: 'plc',
          entityId: 'plc1',
          entityName: null,
          userId: 'user1',
          userName: null,
          timestamp: new Date().toISOString(),
          changes: {},
        },
      ]);

      const result = await analyticsService.getRecentActivity(10);

      expect(result[0].userName).toBe('System');
      expect(result[0].entityName).toBe('Unknown');
      expect(result[0].action).toBe('delete');
    });
  });

  describe('clearCache', () => {
    it('should clear all analytics cache keys', async () => {
      // Mock scan to return analytics keys
      mockRedisScan
        .mockResolvedValueOnce({
          cursor: '5',
          keys: [
            'analytics:overview',
            'analytics:distribution:site',
            'analytics:distribution:make',
          ],
        })
        .mockResolvedValueOnce({
          cursor: '0',
          keys: [
            'analytics:top_models:10',
            'analytics:activity:20:0',
          ],
        });

      await analyticsService.clearCache();

      expect(mockRedisScan).toHaveBeenCalledTimes(2);
      expect(mockRedisScan).toHaveBeenCalledWith('0', {
        MATCH: 'analytics:*',
        COUNT: 100,
      });
      expect(mockRedisScan).toHaveBeenCalledWith('5', {
        MATCH: 'analytics:*',
        COUNT: 100,
      });
      
      expect(mockRedisUnlink).toHaveBeenCalledTimes(2);
      expect(mockRedisUnlink).toHaveBeenNthCalledWith(1,
        'analytics:overview',
        'analytics:distribution:site',
        'analytics:distribution:make',
      );
      expect(mockRedisUnlink).toHaveBeenNthCalledWith(2,
        'analytics:top_models:10',
        'analytics:activity:20:0',
      );
    });
  });
});

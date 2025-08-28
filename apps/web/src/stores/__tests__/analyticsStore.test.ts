import { act, renderHook } from '@testing-library/react';
import { useAnalyticsStore } from '../analyticsStore';
import analyticsService from '../../services/analytics.service';
import {
  DashboardOverview,
  DistributionData,
  HierarchyNode,
  RecentActivity,
  TopModel,
} from '../../types/analytics';

// Mock the analytics service
jest.mock('../../services/analytics.service');

describe('analyticsStore', () => {
  const mockOverview: DashboardOverview = {
    totalEquipment: 100,
    totalPLCs: 200,
    totalSites: 10,
    totalCells: 50,
    weeklyTrend: { percentage: 5.5, direction: 'up' },
    lastUpdated: new Date(),
  };

  const mockDistribution: DistributionData = {
    labels: ['Site A', 'Site B'],
    values: [100, 75],
    percentages: [57.1, 42.9],
    colors: ['#0088FE', '#00C49F'],
  };

  const mockTopModels: TopModel[] = [
    { make: 'Allen Bradley', model: 'CompactLogix', count: 50, percentage: 50 },
    { make: 'Siemens', model: 'S7-1200', count: 30, percentage: 30 },
  ];

  const mockHierarchy: HierarchyNode[] = [
    {
      id: 'site1',
      name: 'Site 1',
      type: 'site',
      count: 15,
      children: [],
    },
  ];

  const mockActivities: RecentActivity[] = [
    {
      id: '1',
      action: 'create',
      entityType: 'plc',
      entityName: 'PLC-001',
      userId: 'user1',
      userName: 'John Doe',
      timestamp: new Date(),
    },
  ];

  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useAnalyticsStore());
    act(() => {
      result.current.reset();
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('fetchOverview', () => {
    it('should fetch and store overview data', async () => {
      (analyticsService.getOverview as jest.Mock).mockResolvedValue(mockOverview);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchOverview();
      });

      expect(result.current.overview).toEqual(mockOverview);
      expect(result.current.loadingOverview).toBe(false);
      expect(result.current.overviewError).toBeNull();
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      (analyticsService.getOverview as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchOverview();
      });

      expect(result.current.overview).toBeNull();
      expect(result.current.loadingOverview).toBe(false);
      expect(result.current.overviewError).toBe('Network error');
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: DashboardOverview) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (analyticsService.getOverview as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.fetchOverview();
      });

      expect(result.current.loadingOverview).toBe(true);

      await act(async () => {
        resolvePromise!(mockOverview);
      });

      expect(result.current.loadingOverview).toBe(false);
    });
  });

  describe('fetchDistribution', () => {
    it('should fetch all distribution types', async () => {
      (analyticsService.getDistribution as jest.Mock).mockResolvedValue(mockDistribution);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchDistribution();
      });

      expect(analyticsService.getDistribution).toHaveBeenCalledTimes(3);
      expect(analyticsService.getDistribution).toHaveBeenCalledWith('site');
      expect(analyticsService.getDistribution).toHaveBeenCalledWith('make');
      expect(analyticsService.getDistribution).toHaveBeenCalledWith('equipment_type');
      
      expect(result.current.distribution.site).toEqual(mockDistribution);
      expect(result.current.distribution.make).toEqual(mockDistribution);
      expect(result.current.distribution.type).toEqual(mockDistribution);
    });

    it('should fetch specific distribution type', async () => {
      (analyticsService.getDistribution as jest.Mock).mockResolvedValue(mockDistribution);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchDistribution('site');
      });

      expect(analyticsService.getDistribution).toHaveBeenCalledTimes(1);
      expect(analyticsService.getDistribution).toHaveBeenCalledWith('site');
      expect(result.current.distribution.site).toEqual(mockDistribution);
    });
  });

  describe('fetchTopModels', () => {
    it('should fetch top models with default limit', async () => {
      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchTopModels();
      });

      expect(analyticsService.getTopModels).toHaveBeenCalledWith(10);
      expect(result.current.topModels).toEqual(mockTopModels);
    });

    it('should fetch top models with custom limit', async () => {
      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchTopModels(20);
      });

      expect(analyticsService.getTopModels).toHaveBeenCalledWith(20);
    });
  });

  describe('fetchRecentActivity', () => {
    it('should fetch initial activity', async () => {
      (analyticsService.getRecentActivity as jest.Mock).mockResolvedValue({
        data: mockActivities,
        pagination: { page: 1, limit: 20, hasMore: true },
      });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchRecentActivity();
      });

      expect(result.current.recentActivity).toEqual(mockActivities);
      expect(result.current.activityPage).toBe(1);
      expect(result.current.hasMoreActivity).toBe(true);
    });

    it('should load more activity', async () => {
      const initialActivities = [mockActivities[0]];
      const moreActivities = [
        {
          id: '2',
          action: 'update' as const,
          entityType: 'equipment' as const,
          entityName: 'Equipment-01',
          userId: 'user2',
          userName: 'Jane Smith',
          timestamp: new Date(),
        },
      ];

      (analyticsService.getRecentActivity as jest.Mock)
        .mockResolvedValueOnce({
          data: initialActivities,
          pagination: { page: 1, limit: 20, hasMore: true },
        })
        .mockResolvedValueOnce({
          data: moreActivities,
          pagination: { page: 2, limit: 20, hasMore: false },
        });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchRecentActivity();
      });

      expect(result.current.recentActivity).toHaveLength(1);

      await act(async () => {
        await result.current.fetchRecentActivity(true);
      });

      expect(result.current.recentActivity).toHaveLength(2);
      expect(result.current.activityPage).toBe(2);
      expect(result.current.hasMoreActivity).toBe(false);
    });
  });

  describe('fetchAllData', () => {
    it('should fetch all data types', async () => {
      (analyticsService.getOverview as jest.Mock).mockResolvedValue(mockOverview);
      (analyticsService.getDistribution as jest.Mock).mockResolvedValue(mockDistribution);
      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);
      (analyticsService.getHierarchy as jest.Mock).mockResolvedValue(mockHierarchy);
      (analyticsService.getRecentActivity as jest.Mock).mockResolvedValue({
        data: mockActivities,
        pagination: { page: 1, limit: 20, hasMore: false },
      });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(result.current.overview).toEqual(mockOverview);
      expect(result.current.topModels).toEqual(mockTopModels);
      expect(result.current.hierarchy).toEqual(mockHierarchy);
      expect(result.current.recentActivity).toEqual(mockActivities);
    });
  });

  describe('exportDashboard', () => {
    it('should export dashboard data', async () => {
      const mockExportData = {
        overview: mockOverview,
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'test-user',
          format: 'pdf',
        },
      };

      (analyticsService.exportDashboard as jest.Mock).mockResolvedValue(mockExportData);

      const { result } = renderHook(() => useAnalyticsStore());

      let exportResult: Awaited<ReturnType<typeof result.current.exportDashboard>> | undefined;
      await act(async () => {
        exportResult = await result.current.exportDashboard({
          format: 'pdf',
          sections: ['overview'],
        });
      });

      expect(exportResult).toEqual(mockExportData);
      expect(result.current.exportingDashboard).toBe(false);
      expect(result.current.exportError).toBeNull();
    });

    it('should handle export error', async () => {
      const error = new Error('Export failed');
      (analyticsService.exportDashboard as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAnalyticsStore());

      let exportResult: Awaited<ReturnType<typeof result.current.exportDashboard>> | undefined;
      await act(async () => {
        exportResult = await result.current.exportDashboard({
          format: 'pdf',
          sections: ['overview'],
        });
      });

      expect(exportResult).toBeNull();
      expect(result.current.exportError).toBe('Export failed');
    });
  });

  describe('setAutoRefresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set auto-refresh interval', async () => {
      (analyticsService.getOverview as jest.Mock).mockResolvedValue(mockOverview);
      (analyticsService.getDistribution as jest.Mock).mockResolvedValue(mockDistribution);
      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);
      (analyticsService.getHierarchy as jest.Mock).mockResolvedValue(mockHierarchy);
      (analyticsService.getRecentActivity as jest.Mock).mockResolvedValue({
        data: mockActivities,
        pagination: { page: 1, limit: 20, hasMore: false },
      });

      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.setAutoRefresh(1000); // 1 second for testing
      });

      expect(result.current.autoRefreshInterval).not.toBeNull();

      // Fast forward time
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // fetchAllData should have been called
      expect(analyticsService.getOverview).toHaveBeenCalled();
    });

    it('should clear auto-refresh when set to null', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.setAutoRefresh(1000);
      });

      expect(result.current.autoRefreshInterval).not.toBeNull();

      act(() => {
        result.current.setAutoRefresh(null);
      });

      expect(result.current.autoRefreshInterval).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear cache and refresh data', async () => {
      (analyticsService.clearCache as jest.Mock).mockResolvedValue(undefined);
      (analyticsService.getOverview as jest.Mock).mockResolvedValue(mockOverview);
      (analyticsService.getDistribution as jest.Mock).mockResolvedValue(mockDistribution);
      (analyticsService.getTopModels as jest.Mock).mockResolvedValue(mockTopModels);
      (analyticsService.getHierarchy as jest.Mock).mockResolvedValue(mockHierarchy);
      (analyticsService.getRecentActivity as jest.Mock).mockResolvedValue({
        data: mockActivities,
        pagination: { page: 1, limit: 20, hasMore: false },
      });

      const { result } = renderHook(() => useAnalyticsStore());

      await act(async () => {
        await result.current.clearCache();
      });

      expect(analyticsService.clearCache).toHaveBeenCalled();
      expect(analyticsService.getOverview).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useAnalyticsStore());

      act(() => {
        result.current.setAutoRefresh(1000);
      });

      expect(result.current.autoRefreshInterval).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.overview).toBeNull();
      expect(result.current.topModels).toEqual([]);
      expect(result.current.hierarchy).toEqual([]);
      expect(result.current.recentActivity).toEqual([]);
      expect(result.current.autoRefreshInterval).toBeNull();
    });
  });
});

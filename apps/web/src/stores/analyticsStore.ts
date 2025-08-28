import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AxiosError } from 'axios';
import analyticsService from '../services/analytics.service';
import {
  AnalyticsExportData,
  AnalyticsExportOptions,
  DashboardOverview,
  DistributionData,
  HierarchyNode,
  RecentActivity,
  TopModel,
} from '../types/analytics';

interface AnalyticsState {
  // Data
  overview: DashboardOverview | null;
  distribution: {
    site: DistributionData | null;
    make: DistributionData | null;
    type: DistributionData | null;
  };
  topModels: TopModel[];
  hierarchy: HierarchyNode[];
  recentActivity: RecentActivity[];

  // Pagination
  activityPage: number;
  activityLimit: number;
  hasMoreActivity: boolean;

  // Loading states
  loadingOverview: boolean;
  loadingDistribution: boolean;
  loadingTopModels: boolean;
  loadingHierarchy: boolean;
  loadingActivity: boolean;
  exportingDashboard: boolean;

  // Error states
  overviewError: string | null;
  distributionError: string | null;
  topModelsError: string | null;
  hierarchyError: string | null;
  activityError: string | null;
  exportError: string | null;

  // Timestamps for caching
  lastFetched: {
    overview: number | null;
    distribution: number | null;
    topModels: number | null;
    hierarchy: number | null;
    activity: number | null;
  };

  // Auto-refresh
  autoRefreshInterval: number | null;

  // Actions
  fetchOverview: () => Promise<void>;
  fetchDistribution: (type?: 'site' | 'make' | 'equipment_type') => Promise<void>;
  fetchTopModels: (limit?: number) => Promise<void>;
  fetchHierarchy: () => Promise<void>;
  fetchRecentActivity: (loadMore?: boolean) => Promise<void>;
  fetchAllData: () => Promise<void>;
  exportDashboard: (options: AnalyticsExportOptions) => Promise<AnalyticsExportData | null>;
  clearCache: () => Promise<void>;
  setAutoRefresh: (intervalMs: number | null) => void;
  reset: () => void;
}

const initialState = {
  overview: null,
  distribution: {
    site: null,
    make: null,
    type: null,
  },
  topModels: [],
  hierarchy: [],
  recentActivity: [],
  activityPage: 1,
  activityLimit: 20,
  hasMoreActivity: true,
  loadingOverview: false,
  loadingDistribution: false,
  loadingTopModels: false,
  loadingHierarchy: false,
  loadingActivity: false,
  exportingDashboard: false,
  overviewError: null,
  distributionError: null,
  topModelsError: null,
  hierarchyError: null,
  activityError: null,
  exportError: null,
  lastFetched: {
    overview: null,
    distribution: null,
    topModels: null,
    hierarchy: null,
    activity: null,
  },
  autoRefreshInterval: null,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchOverview: async () => {
        set({ loadingOverview: true, overviewError: null });
        try {
          const data = await analyticsService.getOverview();
          set({
            overview: data,
            loadingOverview: false,
            lastFetched: {
              ...get().lastFetched,
              overview: Date.now(),
            },
          });
        } catch (error) {
          set({
            loadingOverview: false,
            overviewError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
        }
      },

      fetchDistribution: async type => {
        set({ loadingDistribution: true, distributionError: null });
        try {
          const types = type ? [type] : (['site', 'make', 'equipment_type'] as const);
          const results = await Promise.all(types.map(t => analyticsService.getDistribution(t)));

          const distribution = { ...get().distribution };
          types.forEach((t, index) => {
            const key = t === 'equipment_type' ? 'type' : t;
            distribution[key] = results[index];
          });

          set({
            distribution,
            loadingDistribution: false,
            lastFetched: {
              ...get().lastFetched,
              distribution: Date.now(),
            },
          });
        } catch (error) {
          set({
            loadingDistribution: false,
            distributionError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
        }
      },

      fetchTopModels: async (limit = 10) => {
        set({ loadingTopModels: true, topModelsError: null });
        try {
          const data = await analyticsService.getTopModels(limit);
          set({
            topModels: data,
            loadingTopModels: false,
            lastFetched: {
              ...get().lastFetched,
              topModels: Date.now(),
            },
          });
        } catch (error) {
          set({
            loadingTopModels: false,
            topModelsError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
        }
      },

      fetchHierarchy: async () => {
        set({ loadingHierarchy: true, hierarchyError: null });
        try {
          const data = await analyticsService.getHierarchy();
          set({
            hierarchy: data,
            loadingHierarchy: false,
            lastFetched: {
              ...get().lastFetched,
              hierarchy: Date.now(),
            },
          });
        } catch (error) {
          set({
            loadingHierarchy: false,
            hierarchyError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
        }
      },

      fetchRecentActivity: async (loadMore = false) => {
        set({ loadingActivity: true, activityError: null });
        try {
          const state = get();
          const page = loadMore ? state.activityPage + 1 : 1;
          const result = await analyticsService.getRecentActivity(state.activityLimit, page);

          set({
            recentActivity: loadMore ? [...state.recentActivity, ...result.data] : result.data,
            activityPage: page,
            hasMoreActivity: result.pagination.hasMore,
            loadingActivity: false,
            lastFetched: {
              ...state.lastFetched,
              activity: Date.now(),
            },
          });
        } catch (error) {
          set({
            loadingActivity: false,
            activityError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
        }
      },

      fetchAllData: async () => {
        const promises = [
          get().fetchOverview(),
          get().fetchDistribution(),
          get().fetchTopModels(),
          get().fetchHierarchy(),
          get().fetchRecentActivity(),
        ];
        await Promise.allSettled(promises);
      },

      exportDashboard: async options => {
        set({ exportingDashboard: true, exportError: null });
        try {
          const data = await analyticsService.exportDashboard(options);
          set({ exportingDashboard: false });
          return data;
        } catch (error) {
          set({
            exportingDashboard: false,
            exportError:
              (error as AxiosError<{ error: string }>).response?.data?.error ||
              (error instanceof Error ? error.message : 'An error occurred'),
          });
          return null;
        }
      },

      clearCache: async () => {
        try {
          await analyticsService.clearCache();
          // Refresh all data after clearing cache
          await get().fetchAllData();
        } catch (error) {
          // Failed to clear cache
        }
      },

      setAutoRefresh: intervalMs => {
        const state = get();

        // Clear existing interval
        if (state.autoRefreshInterval) {
          clearInterval(state.autoRefreshInterval);
        }

        if (intervalMs && intervalMs > 0) {
          const interval = setInterval(() => {
            get().fetchAllData();
          }, intervalMs);
          set({ autoRefreshInterval: interval as unknown as number });
        } else {
          set({ autoRefreshInterval: null });
        }
      },

      reset: () => {
        const state = get();
        if (state.autoRefreshInterval) {
          clearInterval(state.autoRefreshInterval);
        }
        set(initialState);
      },
    }),
    {
      name: 'analytics-store',
    }
  )
);

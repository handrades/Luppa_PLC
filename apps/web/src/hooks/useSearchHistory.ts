/**
 * useSearchHistory Hook
 *
 * Manages search history with localStorage persistence and utilities
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useMemo } from 'react';
import { useSearchStore } from '../stores/search.store';
import { RecentSearch } from '../types/search';

interface UseSearchHistoryOptions {
  maxHistorySize?: number;
  autoCleanupDays?: number;
}

interface UseSearchHistoryReturn {
  // State
  recentSearches: RecentSearch[];

  // Actions
  addToHistory: (query: string, resultCount?: number, executionTime?: number) => void;
  clearHistory: () => void;
  removeFromHistory: (index: number) => void;
  getSearchFromHistory: (index: number) => RecentSearch | null;

  // Utilities
  getFrequentSearches: (limit?: number) => Array<{ query: string; count: number }>;
  getRecentByTimeRange: (hours: number) => RecentSearch[];
  exportHistory: () => string;
  importHistory: (data: string) => boolean;

  // Computed
  hasHistory: boolean;
  totalSearches: number;
  averageExecutionTime: number;
}

/**
 * useSearchHistory Hook
 *
 * @param options - Configuration options for search history
 * @returns Search history state and utilities
 */
export function useSearchHistory(options: UseSearchHistoryOptions = {}): UseSearchHistoryReturn {
  const { maxHistorySize = 50, autoCleanupDays = 30 } = options;

  // Store selectors
  const {
    recentSearches,
    addToHistory: storeAddToHistory,
    clearHistory: storeClearHistory,
    removeFromHistory: storeRemoveFromHistory,
  } = useSearchStore();

  // Enhanced add to history with cleanup and size limiting
  const addToHistory = useCallback(
    (query: string, resultCount = 0, executionTime = 0) => {
      // Clean up old entries by date before adding new one
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - autoCleanupDays);

      // Filter out expired entries
      const validSearches = recentSearches.filter(
        search => new Date(search.timestamp) >= cutoffDate
      );

      // Apply size limit - keep only the most recent entries
      const limitedSearches = validSearches
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxHistorySize - 1); // Reserve space for new entry

      // If we need to prune, clear and re-add limited entries
      if (recentSearches.length !== limitedSearches.length) {
        storeClearHistory();
        limitedSearches.reverse().forEach(search => {
          storeAddToHistory(search.query, search.resultCount, search.executionTime);
        });
      }

      // Add the new search
      storeAddToHistory(query, resultCount, executionTime);
    },
    [storeAddToHistory, storeClearHistory, autoCleanupDays, maxHistorySize, recentSearches]
  );

  // Get search by index
  const getSearchFromHistory = useCallback(
    (index: number): RecentSearch | null => {
      return recentSearches[index] || null;
    },
    [recentSearches]
  );

  // Get frequent searches (grouped by query)
  const getFrequentSearches = useCallback(
    (limit = 10): Array<{ query: string; count: number }> => {
      const queryCount = recentSearches.reduce(
        (acc, search) => {
          acc[search.query] = (acc[search.query] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return Object.entries(queryCount)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    [recentSearches]
  );

  // Get searches within time range
  const getRecentByTimeRange = useCallback(
    (hours: number): RecentSearch[] => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      return recentSearches.filter(search => new Date(search.timestamp) >= cutoffTime);
    },
    [recentSearches]
  );

  // Export history as JSON string
  const exportHistory = useCallback((): string => {
    const exportData = {
      searches: recentSearches,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(exportData, null, 2);
  }, [recentSearches]);

  // Import history from JSON string
  const importHistory = useCallback(
    (data: string): boolean => {
      try {
        const importData = JSON.parse(data);

        if (!importData.searches || !Array.isArray(importData.searches)) {
          throw new Error('Invalid format: searches array not found');
        }

        // Validate search objects
        const validSearches = importData.searches.filter((search: unknown) => {
          const searchObj = search as Record<string, unknown>;
          return (
            searchObj &&
            typeof searchObj.query === 'string' &&
            searchObj.timestamp &&
            typeof searchObj.resultCount === 'number' &&
            typeof searchObj.executionTime === 'number'
          );
        });

        // Merge with existing searches (avoiding duplicates)
        const existingQueries = new Set(recentSearches.map(s => s.query));
        const newSearches = validSearches.filter(
          (search: RecentSearch) => !existingQueries.has(search.query)
        );

        // Add new searches to history
        newSearches.forEach((search: RecentSearch) => {
          addToHistory(search.query, search.resultCount, search.executionTime);
        });

        return true;
      } catch (_error) {
        if (process.env.NODE_ENV === 'development') {
          // console.warn('Failed to import search history:', _error);
        }
        return false;
      }
    },
    [recentSearches, addToHistory]
  );

  // Computed values
  const computed = useMemo(() => {
    const hasHistory = recentSearches.length > 0;
    const totalSearches = recentSearches.length;
    const averageExecutionTime = hasHistory
      ? recentSearches.reduce((sum, search) => sum + search.executionTime, 0) / totalSearches
      : 0;

    return {
      hasHistory,
      totalSearches,
      averageExecutionTime,
    };
  }, [recentSearches]);

  return {
    // State
    recentSearches,

    // Actions
    addToHistory,
    clearHistory: storeClearHistory,
    removeFromHistory: storeRemoveFromHistory,
    getSearchFromHistory,

    // Utilities
    getFrequentSearches,
    getRecentByTimeRange,
    exportHistory,
    importHistory,

    // Computed
    ...computed,
  };
}

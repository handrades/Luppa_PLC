/**
 * Filter Performance Hook
 * Story 5.1: Advanced Filtering System
 *
 * Hook for managing filter performance optimization including
 * debouncing, caching, query optimization, and performance monitoring.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FilterBatchProcessor,
  FilterCache,
  FilterDebounceManager,
  FilterPerformanceMonitor,
  ProgressiveFilterLoader,
  analyzeFilterComplexity,
  estimateResultCount,
  generateIndexHints,
} from '../utils/filter-performance.utils';
import type { AdvancedFilters } from '../types/advanced-filters';
import type { Equipment } from '../types/equipment';

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

/**
 * Performance optimization configuration
 */
interface FilterPerformanceConfig {
  enableDebouncing: boolean;
  debounceDelay: number;
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number;
  enableBatching: boolean;
  batchSize: number;
  enableProgressiveLoading: boolean;
  enableMonitoring: boolean;
  complexityThreshold: number;
  resultCountThreshold: number;
}

/**
 * Default performance configuration
 */
const DEFAULT_CONFIG: FilterPerformanceConfig = {
  enableDebouncing: true,
  debounceDelay: 300,
  enableCaching: true,
  cacheSize: 100,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  enableBatching: true,
  batchSize: 50,
  enableProgressiveLoading: true,
  enableMonitoring: true,
  complexityThreshold: 10,
  resultCountThreshold: 1000,
};

// =============================================================================
// HOOK OPTIONS
// =============================================================================

/**
 * Options for configuring the useFilterPerformance hook
 */
interface UseFilterPerformanceOptions {
  /**
   * Performance configuration overrides
   */
  config?: Partial<FilterPerformanceConfig>;

  /**
   * Custom data loader function
   */
  dataLoader?: (
    filters: AdvancedFilters,
    offset?: number,
    limit?: number
  ) => Promise<{ data: Equipment[]; total: number }>;

  /**
   * Custom result count estimator
   */
  countEstimator?: (filters: AdvancedFilters) => Promise<number>;

  /**
   * Performance event handler
   */
  onPerformanceEvent?: (event: {
    type: 'slow_query' | 'cache_miss' | 'optimization_applied';
    data: Record<string, unknown>;
  }) => void;

  /**
   * Query optimization handler
   */
  onQueryOptimization?: (optimizations: string[]) => void;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useFilterPerformance hook
 */
interface UseFilterPerformanceReturn {
  // Performance State
  isOptimized: boolean;
  performanceLevel: 'excellent' | 'good' | 'moderate' | 'poor';
  complexity: ReturnType<typeof analyzeFilterComplexity>;

  // Debounced Functions
  debouncedExecute: <T extends (...args: unknown[]) => unknown>(
    key: string,
    fn: T,
    delay?: number
  ) => T;

  // Caching
  getCachedResult: <T>(filters: AdvancedFilters) => T | null;
  setCachedResult: <T>(filters: AdvancedFilters, result: T) => void;
  invalidateCache: (filters?: AdvancedFilters) => void;
  cacheStats: {
    size: number;
    hitRate: number;
    hitCount: number;
    missCount: number;
  };

  // Progressive Loading
  loadProgressive: (
    filters: AdvancedFilters,
    onProgress?: (loaded: number, total: number) => void
  ) => Promise<Equipment[]>;

  // Batch Processing
  processBatch: (filters: AdvancedFilters[]) => Promise<Equipment[][]>;

  // Performance Monitoring
  recordOperation: (data: {
    filters: AdvancedFilters;
    executionTime: number;
    resultCount: number;
    cacheHit: boolean;
  }) => void;
  performanceStats: {
    averageExecutionTime: number;
    p95ExecutionTime: number;
    averageResultCount: number;
    cacheHitRate: number;
    totalOperations: number;
    slowQueries: Array<{
      filters: AdvancedFilters;
      executionTime: number;
      timestamp: Date;
    }>;
  };
  performanceAlerts: Array<{
    type: 'warning' | 'error';
    message: string;
    details: Record<string, unknown>;
  }>;

  // Query Optimization
  optimizeQuery: (filters: AdvancedFilters) => {
    optimizedFilters: AdvancedFilters;
    optimizations: string[];
    indexHints: string[];
  };
  estimateResults: (filters: AdvancedFilters) => Promise<{
    estimatedCount: number;
    confidence: 'low' | 'medium' | 'high';
    shouldProceed: boolean;
    warnings: string[];
  }>;

  // Performance Controls
  enableOptimization: () => void;
  disableOptimization: () => void;
  clearCache: () => void;
  resetMetrics: () => void;

  // Performance Utilities
  getOptimizationSuggestions: (filters: AdvancedFilters) => string[];
  measurePerformance: <T>(
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ) => Promise<{ result: T; duration: number }>;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Filter Performance Hook
 *
 * Provides comprehensive performance optimization for filter operations
 * including debouncing, caching, monitoring, and query optimization.
 */
export const useFilterPerformance = (
  options: UseFilterPerformanceOptions = {}
): UseFilterPerformanceReturn => {
  const {
    config = {},
    dataLoader,
    countEstimator,
    onPerformanceEvent,
    onQueryOptimization,
  } = options;

  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Performance utilities
  const debounceManager = useRef(new FilterDebounceManager(finalConfig));
  const cache = useRef(new FilterCache(finalConfig));
  const performanceMonitor = useRef(new FilterPerformanceMonitor());
  const batchProcessor = useRef(new FilterBatchProcessor(finalConfig));
  const progressiveLoader = useRef(new ProgressiveFilterLoader(finalConfig));

  // State
  const [isOptimizationEnabled, setIsOptimizationEnabled] = useState(true);

  // =============================================================================
  // PERFORMANCE ANALYSIS
  // =============================================================================

  /**
   * Gets current filter complexity
   */
  const getComplexity = useCallback((filters: AdvancedFilters) => {
    return analyzeFilterComplexity(filters);
  }, []);

  /**
   * Determines performance level based on complexity
   */
  const getPerformanceLevel = useCallback(
    (
      complexity: ReturnType<typeof analyzeFilterComplexity>
    ): 'excellent' | 'good' | 'moderate' | 'poor' => {
      if (complexity.score < 3) return 'excellent';
      if (complexity.score < 7) return 'good';
      if (complexity.score < 15) return 'moderate';
      return 'poor';
    },
    []
  );

  // =============================================================================
  // DEBOUNCING
  // =============================================================================

  /**
   * Creates or retrieves a debounced function
   */
  const debouncedExecute = useCallback(
    <T extends (...args: unknown[]) => unknown>(key: string, fn: T, delay?: number): T => {
      if (!finalConfig.enableDebouncing || !isOptimizationEnabled) {
        return fn;
      }

      return debounceManager.current.getDebounced(key, fn, delay);
    },
    [finalConfig.enableDebouncing, isOptimizationEnabled]
  );

  // =============================================================================
  // CACHING
  // =============================================================================

  /**
   * Gets cached result for filters
   */
  const getCachedResult = useCallback(
    <T>(filters: AdvancedFilters): T | null => {
      if (!finalConfig.enableCaching || !isOptimizationEnabled) {
        return null;
      }

      return cache.current.get(filters) as T | null;
    },
    [finalConfig.enableCaching, isOptimizationEnabled]
  );

  /**
   * Sets cached result for filters
   */
  const setCachedResult = useCallback(
    <T>(filters: AdvancedFilters, result: T): void => {
      if (!finalConfig.enableCaching || !isOptimizationEnabled) {
        return;
      }

      cache.current.set(filters, result);
    },
    [finalConfig.enableCaching, isOptimizationEnabled]
  );

  /**
   * Invalidates cache entries
   */
  const invalidateCache = useCallback((filters?: AdvancedFilters): void => {
    cache.current.invalidate(filters);
  }, []);

  /**
   * Gets cache statistics
   */
  const cacheStats = useMemo(() => {
    return cache.current.getStatistics();
  }, []);

  // =============================================================================
  // PROGRESSIVE LOADING
  // =============================================================================

  /**
   * Loads data progressively in batches
   */
  const loadProgressive = useCallback(
    async (
      filters: AdvancedFilters,
      onProgress?: (loaded: number, total: number) => void
    ): Promise<Equipment[]> => {
      if (!dataLoader || !finalConfig.enableProgressiveLoading || !isOptimizationEnabled) {
        throw new Error('Progressive loading requires a data loader function');
      }

      const startTime = Date.now();

      try {
        const result = (await progressiveLoader.current.loadProgressive(
          filters,
          dataLoader,
          onProgress
        )) as Equipment[];

        const executionTime = Date.now() - startTime;

        // Record performance metrics
        performanceMonitor.current.record({
          filters,
          executionTime,
          resultCount: result.length,
          cacheHit: false, // Progressive loading bypasses cache
        });

        return result;
      } catch (error) {
        onPerformanceEvent?.({
          type: 'slow_query',
          data: {
            filters,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        throw error;
      }
    },
    [dataLoader, finalConfig.enableProgressiveLoading, isOptimizationEnabled, onPerformanceEvent]
  );

  // =============================================================================
  // BATCH PROCESSING
  // =============================================================================

  /**
   * Processes multiple filter queries in batches
   */
  const processBatch = useCallback(
    async (filters: AdvancedFilters[]): Promise<Equipment[][]> => {
      if (!dataLoader || !finalConfig.enableBatching || !isOptimizationEnabled) {
        // Fallback to individual processing
        return Promise.all(
          filters.map(async filter => {
            const result = await dataLoader!(filter);
            return result.data;
          })
        );
      }

      const batchLoader = async (filtersList: AdvancedFilters[]): Promise<Equipment[][]> => {
        return Promise.all(
          filtersList.map(async filter => {
            const result = await dataLoader!(filter);
            return result.data;
          })
        );
      };

      const results = await Promise.all(
        filters.map(filter => batchProcessor.current.process(filter, batchLoader))
      );

      return results;
    },
    [dataLoader, finalConfig.enableBatching, isOptimizationEnabled]
  );

  // =============================================================================
  // PERFORMANCE MONITORING
  // =============================================================================

  /**
   * Records a filter operation for performance monitoring
   */
  const recordOperation = useCallback(
    (data: {
      filters: AdvancedFilters;
      executionTime: number;
      resultCount: number;
      cacheHit: boolean;
    }): void => {
      if (!finalConfig.enableMonitoring) {
        return;
      }

      performanceMonitor.current.record(data);
      debounceManager.current.recordExecutionTime(data.executionTime);

      // Trigger performance events
      if (data.executionTime > 2000) {
        onPerformanceEvent?.({
          type: 'slow_query',
          data,
        });
      }

      if (!data.cacheHit && data.executionTime > 1000) {
        onPerformanceEvent?.({
          type: 'cache_miss',
          data,
        });
      }
    },
    [finalConfig.enableMonitoring, onPerformanceEvent]
  );

  /**
   * Gets performance statistics
   */
  const performanceStats = useMemo(() => {
    return performanceMonitor.current.getStatistics();
  }, []);

  /**
   * Gets performance alerts
   */
  const performanceAlerts = useMemo(() => {
    return performanceMonitor.current.getAlerts();
  }, []);

  // =============================================================================
  // QUERY OPTIMIZATION
  // =============================================================================

  /**
   * Optimizes filter query for better performance
   */
  const optimizeQuery = useCallback(
    (filters: AdvancedFilters) => {
      const complexity = getComplexity(filters);
      const indexHints = generateIndexHints(filters);
      const optimizations: string[] = [];

      const optimizedFilters = { ...filters };

      // Apply optimizations based on complexity analysis
      complexity.suggestions.forEach(suggestion => {
        optimizations.push(suggestion);
      });

      // Optimize multi-select filters by limiting selections
      if (filters.siteIds && filters.siteIds.length > 20) {
        optimizations.push('Consider reducing site selection for better performance');
      }

      if (filters.makes && filters.makes.length > 15) {
        optimizations.push('Consider grouping makes into categories');
      }

      // Optimize date ranges
      if (filters.createdAfter && filters.createdBefore) {
        const daysDiff =
          Math.abs(filters.createdBefore.getTime() - filters.createdAfter.getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysDiff > 365) {
          optimizations.push('Consider using smaller date ranges for better performance');
        }
      }

      // Optimize search queries
      if (filters.searchQuery && filters.searchQuery.length > 100) {
        optimizations.push('Long search queries may be slow - consider using specific filters');
        // Truncate very long queries
        optimizedFilters.searchQuery = filters.searchQuery.substring(0, 100);
      }

      if (optimizations.length > 0) {
        onQueryOptimization?.(optimizations);
        onPerformanceEvent?.({
          type: 'optimization_applied',
          data: { originalFilters: filters, optimizedFilters, optimizations },
        });
      }

      return {
        optimizedFilters,
        optimizations,
        indexHints: indexHints.suggestedIndexes,
      };
    },
    [getComplexity, onQueryOptimization, onPerformanceEvent]
  );

  /**
   * Estimates result count for filters
   */
  const estimateResults = useCallback(
    async (filters: AdvancedFilters) => {
      if (!countEstimator) {
        return {
          estimatedCount: 0,
          confidence: 'low' as const,
          shouldProceed: true,
          warnings: ['No count estimator configured'],
        };
      }

      return estimateResultCount(filters, countEstimator);
    },
    [countEstimator]
  );

  // =============================================================================
  // PERFORMANCE CONTROLS
  // =============================================================================

  /**
   * Enables performance optimization
   */
  const enableOptimization = useCallback(() => {
    setIsOptimizationEnabled(true);
  }, []);

  /**
   * Disables performance optimization
   */
  const disableOptimization = useCallback(() => {
    setIsOptimizationEnabled(false);
  }, []);

  /**
   * Clears all caches
   */
  const clearCache = useCallback(() => {
    cache.current.invalidate();
  }, []);

  /**
   * Resets performance metrics
   */
  const resetMetrics = useCallback(() => {
    // Create new monitor instance to reset metrics
    performanceMonitor.current = new FilterPerformanceMonitor();
  }, []);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Gets optimization suggestions for filters
   */
  const getOptimizationSuggestions = useCallback(
    (filters: AdvancedFilters): string[] => {
      const complexity = getComplexity(filters);
      const suggestions: string[] = [...complexity.suggestions];

      // Add performance-specific suggestions
      if (complexity.level === 'very-high') {
        suggestions.push('Consider breaking down this filter into multiple simpler queries');
        suggestions.push('Use filter presets to save complex filter combinations');
      }

      if (complexity.level === 'high') {
        suggestions.push('Monitor query performance and consider caching results');
      }

      return suggestions;
    },
    [getComplexity]
  );

  /**
   * Measures performance of an operation
   */
  const measurePerformance = useCallback(
    async <T>(
      operation: () => Promise<T>,
      metadata: Record<string, unknown> = {}
    ): Promise<{ result: T; duration: number }> => {
      const startTime = performance.now();

      try {
        const result = await operation();
        const duration = performance.now() - startTime;

        if (finalConfig.enableMonitoring) {
          // Log performance measurement
          console.debug('Performance measurement:', {
            duration,
            metadata,
          });
        }

        return { result, duration };
      } catch (error) {
        const duration = performance.now() - startTime;

        onPerformanceEvent?.({
          type: 'slow_query',
          data: {
            duration,
            metadata,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        throw error;
      }
    },
    [finalConfig.enableMonitoring, onPerformanceEvent]
  );

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  /**
   * Current performance state for default filters
   */
  const defaultFilters: AdvancedFilters = {
    siteIds: [],
    cellTypes: [],
    equipmentTypes: [],
    makes: [],
    models: [],
    searchFields: ['name', 'description'],
    page: 1,
    pageSize: 50,
    sortBy: 'name',
    sortOrder: 'asc',
  };

  const complexity = useMemo(() => getComplexity(defaultFilters), [getComplexity]);

  const performanceLevel = useMemo(
    () => getPerformanceLevel(complexity),
    [getPerformanceLevel, complexity]
  );

  const isOptimized = useMemo(
    () => isOptimizationEnabled && performanceLevel !== 'poor',
    [isOptimizationEnabled, performanceLevel]
  );

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Performance monitoring cleanup
   */
  useEffect(() => {
    return () => {
      debounceManager.current.cancelAll();
    };
  }, []);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Performance State
    isOptimized,
    performanceLevel,
    complexity,

    // Debounced Functions
    debouncedExecute,

    // Caching
    getCachedResult,
    setCachedResult,
    invalidateCache,
    cacheStats,

    // Progressive Loading
    loadProgressive,

    // Batch Processing
    processBatch,

    // Performance Monitoring
    recordOperation,
    performanceStats,
    performanceAlerts,

    // Query Optimization
    optimizeQuery,
    estimateResults,

    // Performance Controls
    enableOptimization,
    disableOptimization,
    clearCache,
    resetMetrics,

    // Performance Utilities
    getOptimizationSuggestions,
    measurePerformance,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Lightweight performance hook with minimal features
 */
export const useLightweightPerformance = () => {
  return useFilterPerformance({
    config: {
      enableCaching: false,
      enableBatching: false,
      enableProgressiveLoading: false,
      enableMonitoring: false,
    },
  });
};

/**
 * High-performance hook with all optimizations enabled
 */
export const useHighPerformance = (
  dataLoader: (filters: AdvancedFilters) => Promise<{ data: Equipment[]; total: number }>,
  countEstimator: (filters: AdvancedFilters) => Promise<number>
) => {
  return useFilterPerformance({
    config: {
      enableDebouncing: true,
      debounceDelay: 150,
      enableCaching: true,
      cacheSize: 200,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      enableBatching: true,
      batchSize: 25,
      enableProgressiveLoading: true,
      enableMonitoring: true,
    },
    dataLoader,
    countEstimator,
  });
};

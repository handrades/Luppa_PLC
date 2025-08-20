/**
 * useSearchPerformance Hook
 *
 * Tracks and optimizes search performance metrics
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchStore } from '../stores/search.store';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  searchExecutionTime: number;
  renderTime: number;
  totalTime: number;
  resultCount: number;
  queryLength: number;
  cacheHit: boolean;
}

interface UseSearchPerformanceReturn {
  // Metrics
  currentMetrics: PerformanceMetrics | null;
  averageMetrics: Partial<PerformanceMetrics>;

  // Actions
  startTracking: () => void;
  endTracking: (additionalData?: Partial<PerformanceMetrics>) => void;
  resetMetrics: () => void;

  // Computed
  isTracking: boolean;
  performanceScore: number; // 0-100 score based on metrics
}

/**
 * useSearchPerformance Hook
 *
 * @returns Performance tracking utilities
 */
export function useSearchPerformance(): UseSearchPerformanceReturn {
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const startTimeRef = useRef<number>(0);
  const renderStartRef = useRef<number>(0);

  // Store selectors for tracking search events
  const { loading, results, executionTime, query } = useSearchStore();

  // Start performance tracking
  const startTracking = useCallback(() => {
    startTimeRef.current = performance.now();
    renderStartRef.current = performance.now();
    setIsTracking(true);

    logger.debug('Performance tracking started');
  }, []);

  // End performance tracking
  const endTracking = useCallback(
    (additionalData: Partial<PerformanceMetrics> = {}) => {
      if (!isTracking) return;

      const endTime = performance.now();
      const totalTime = endTime - startTimeRef.current;
      const renderTime = endTime - renderStartRef.current;

      // Determine cache hit based on execution time heuristic
      // Very fast searches (< 50ms) are likely cache hits
      const isCacheHit = executionTime < 50 && results.length > 0;

      const metrics: PerformanceMetrics = {
        searchExecutionTime: executionTime,
        renderTime,
        totalTime,
        resultCount: results.length,
        queryLength: query.length,
        cacheHit: isCacheHit,
        ...additionalData,
      };

      setCurrentMetrics(metrics);
      setMetricsHistory(prev => [...prev.slice(-19), metrics]); // Keep last 20 metrics
      setIsTracking(false);

      // Log performance metrics
      logger.info('Search performance metrics', {
        totalTime: metrics.totalTime.toFixed(2),
        searchTime: metrics.searchExecutionTime,
        renderTime: metrics.renderTime.toFixed(2),
        resultCount: metrics.resultCount,
        queryLength: metrics.queryLength,
      });

      // Warn if performance is poor
      if (metrics.totalTime > 2000) {
        logger.warn(
          'Slow search performance detected',
          metrics as unknown as Record<string, unknown>
        );
      }
    },
    [isTracking, executionTime, results.length, query.length]
  );

  // Reset metrics history
  const resetMetrics = useCallback(() => {
    setMetricsHistory([]);
    setCurrentMetrics(null);
    setIsTracking(false);
  }, []);

  // Calculate average metrics
  const averageMetrics = useCallback((): Partial<PerformanceMetrics> => {
    if (metricsHistory.length === 0) return {};

    const sums = metricsHistory.reduce(
      (acc, metrics) => ({
        searchExecutionTime: acc.searchExecutionTime + metrics.searchExecutionTime,
        renderTime: acc.renderTime + metrics.renderTime,
        totalTime: acc.totalTime + metrics.totalTime,
        resultCount: acc.resultCount + metrics.resultCount,
        queryLength: acc.queryLength + metrics.queryLength,
      }),
      {
        searchExecutionTime: 0,
        renderTime: 0,
        totalTime: 0,
        resultCount: 0,
        queryLength: 0,
      }
    );

    const count = metricsHistory.length;
    return {
      searchExecutionTime: sums.searchExecutionTime / count,
      renderTime: sums.renderTime / count,
      totalTime: sums.totalTime / count,
      resultCount: sums.resultCount / count,
      queryLength: sums.queryLength / count,
    };
  }, [metricsHistory]);

  // Calculate performance score (0-100)
  const calculatePerformanceScore = useCallback((): number => {
    if (!currentMetrics) return 100;

    const { totalTime, resultCount, searchExecutionTime } = currentMetrics;

    // Base score starts at 100
    let score = 100;

    // Deduct points for slow total time
    if (totalTime > 1000) score -= 20;
    if (totalTime > 2000) score -= 30;
    if (totalTime > 3000) score -= 40;

    // Deduct points for slow search execution
    if (searchExecutionTime > 100) score -= 10;
    if (searchExecutionTime > 500) score -= 20;
    if (searchExecutionTime > 1000) score -= 30;

    // Bonus points for good performance with many results
    if (resultCount > 100 && totalTime < 1000) score += 10;
    if (resultCount > 500 && totalTime < 1500) score += 15;

    return Math.max(0, Math.min(100, score));
  }, [currentMetrics]);

  // Auto-start tracking when search begins
  useEffect(() => {
    if (loading && !isTracking) {
      startTracking();
    }
  }, [loading, isTracking, startTracking]);

  // Auto-end tracking when search completes
  useEffect(() => {
    if (!loading && isTracking) {
      // Delay slightly to account for render time
      const timer = setTimeout(() => {
        endTracking();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [loading, isTracking, endTracking]);

  return {
    // Metrics
    currentMetrics,
    averageMetrics: averageMetrics(),

    // Actions
    startTracking,
    endTracking,
    resetMetrics,

    // Computed
    isTracking,
    performanceScore: calculatePerformanceScore(),
  };
}

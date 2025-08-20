/**
 * Filter Performance Optimization Utilities
 * Story 5.1: Advanced Filtering System
 *
 * Utilities for optimizing filter performance through debouncing,
 * caching, query optimization, and performance monitoring.
 */

import { AdvancedFilters } from '../types/advanced-filters';
import { debounce } from 'lodash-es';

// =============================================================================
// PERFORMANCE CONFIGURATION
// =============================================================================

/**
 * Configuration for filter performance optimization
 */
export interface FilterPerformanceConfig {
  debounceDelay: number;
  cacheSize: number;
  cacheTTL: number;
  complexityThreshold: number;
  resultCountEstimationThreshold: number;
  batchSize: number;
  maxConcurrentRequests: number;
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: FilterPerformanceConfig = {
  debounceDelay: 300,
  cacheSize: 100,
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  complexityThreshold: 10,
  resultCountEstimationThreshold: 1000,
  batchSize: 50,
  maxConcurrentRequests: 3,
};

// =============================================================================
// SMART DEBOUNCING
// =============================================================================

/**
 * Debounce manager for filter operations with smart delay adjustment
 */
export class FilterDebounceManager {
  private debouncedFunctions = new Map<string, ReturnType<typeof debounce>>();
  private recentExecutionTimes: number[] = [];
  private config: FilterPerformanceConfig;

  constructor(config: Partial<FilterPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Gets or creates a debounced function with smart delay adjustment
   */
  getDebounced<T extends (...args: unknown[]) => unknown>(
    key: string,
    fn: T,
    customDelay?: number
  ): T {
    if (!this.debouncedFunctions.has(key)) {
      const delay = customDelay || this.calculateOptimalDelay();
      const debouncedFn = debounce(fn, delay);
      this.debouncedFunctions.set(key, debouncedFn);
    }
    return this.debouncedFunctions.get(key) as unknown as T;
  }

  /**
   * Calculates optimal debounce delay based on recent execution times
   */
  private calculateOptimalDelay(): number {
    if (this.recentExecutionTimes.length === 0) {
      return this.config.debounceDelay;
    }

    const averageTime =
      this.recentExecutionTimes.reduce((a, b) => a + b, 0) / this.recentExecutionTimes.length;

    // Adjust delay based on average execution time
    if (averageTime > 1000) {
      return Math.min(this.config.debounceDelay * 2, 1000);
    } else if (averageTime < 100) {
      return Math.max(this.config.debounceDelay * 0.5, 100);
    }

    return this.config.debounceDelay;
  }

  /**
   * Records execution time for delay optimization
   */
  recordExecutionTime(time: number): void {
    this.recentExecutionTimes.push(time);
    if (this.recentExecutionTimes.length > 10) {
      this.recentExecutionTimes.shift();
    }
  }

  /**
   * Cancels all debounced functions
   */
  cancelAll(): void {
    this.debouncedFunctions.forEach(fn => fn.cancel());
  }

  /**
   * Flushes all debounced functions
   */
  flushAll(): void {
    this.debouncedFunctions.forEach(fn => fn.flush());
  }
}

// =============================================================================
// INTELLIGENT CACHING
// =============================================================================

/**
 * Cache entry for filter results
 */
interface FilterCacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  filterHash: string;
}

/**
 * Intelligent cache for filter results with LRU and TTL eviction
 */
export class FilterCache<T = unknown> {
  private cache = new Map<string, FilterCacheEntry<T>>();
  private config: FilterPerformanceConfig;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<FilterPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Gets cached result for filters
   */
  get(filters: AdvancedFilters): T | null {
    const key = this.generateCacheKey(filters);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    const now = Date.now();

    // Check TTL
    if (now - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.hitCount++;

    return entry.data;
  }

  /**
   * Sets cached result for filters
   */
  set(filters: AdvancedFilters, data: T): void {
    const key = this.generateCacheKey(filters);
    const now = Date.now();

    // Evict old entries if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      filterHash: key,
    });
  }

  /**
   * Invalidates cache entries that might be affected by the given filters
   */
  invalidate(filters?: AdvancedFilters): void {
    if (!filters) {
      this.cache.clear();
      return;
    }

    const targetKey = this.generateCacheKey(filters);

    // Remove exact matches and related entries
    const keysToRemove: string[] = [];

    this.cache.forEach((entry, key) => {
      if (key === targetKey || this.areFiltersRelated(filters, entry.filterHash)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.cache.delete(key));
  }

  /**
   * Gets cache statistics
   */
  getStatistics(): {
    size: number;
    hitRate: number;
    hitCount: number;
    missCount: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      oldestEntry:
        entries.length > 0 ? new Date(Math.min(...entries.map(e => e.timestamp))) : undefined,
      newestEntry:
        entries.length > 0 ? new Date(Math.max(...entries.map(e => e.timestamp))) : undefined,
    };
  }

  /**
   * Generates a cache key for filters
   */
  private generateCacheKey(filters: AdvancedFilters): string {
    // Create a normalized representation of filters for consistent caching
    const normalized = JSON.stringify(filters, Object.keys(filters).sort());

    // Use a simple hash function for the key
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Evicts least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Checks if filters are related for invalidation purposes
   */
  private areFiltersRelated(_filters1: AdvancedFilters, _filterHash: string): boolean {
    // This is a simplified implementation
    // In practice, you might want more sophisticated relationship detection
    return false;
  }
}

// =============================================================================
// QUERY OPTIMIZATION
// =============================================================================

/**
 * Analyzes filter complexity and provides optimization suggestions
 */
export const analyzeFilterComplexity = (
  filters: AdvancedFilters
): {
  score: number;
  level: 'low' | 'medium' | 'high' | 'very-high';
  bottlenecks: string[];
  suggestions: string[];
} => {
  let score = 0;
  const bottlenecks: string[] = [];
  const suggestions: string[] = [];

  // Multi-select complexity
  const multiSelectScore =
    (filters.siteIds?.length || 0) * 0.1 +
    (filters.cellTypes?.length || 0) * 0.1 +
    (filters.equipmentTypes?.length || 0) * 0.2 +
    (filters.makes?.length || 0) * 0.15 +
    (filters.models?.length || 0) * 0.1;

  if (multiSelectScore > 5) {
    bottlenecks.push('Multiple multi-select filters with many options');
    suggestions.push('Consider using presets for common filter combinations');
  }

  score += multiSelectScore;

  // Date range complexity
  const dateFilters = [
    filters.createdAfter,
    filters.createdBefore,
    filters.updatedAfter,
    filters.updatedBefore,
  ].filter(Boolean).length;

  if (dateFilters > 2) {
    bottlenecks.push('Complex date range filtering');
    suggestions.push('Use single date range filters when possible');
  }

  score += dateFilters * 1;

  // IP range complexity
  if (filters.ipRange?.cidr) {
    score += 2;
  } else if (filters.ipRange?.startIP && filters.ipRange?.endIP) {
    score += 1.5;
    suggestions.push('CIDR notation is more efficient than IP ranges');
  }

  // Tag filter complexity
  if (filters.tagFilter) {
    const tagComplexity =
      (filters.tagFilter.include?.length || 0) * 0.3 +
      (filters.tagFilter.exclude?.length || 0) * 0.2;

    if (tagComplexity > 3) {
      bottlenecks.push('Complex tag filtering with many include/exclude rules');
      suggestions.push('Use tag categories or presets to simplify tag filtering');
    }

    score += tagComplexity;
  }

  // Search query complexity
  if (filters.searchQuery && filters.searchQuery.length > 100) {
    bottlenecks.push('Very long search query');
    suggestions.push('Break down complex searches into specific filters');
    score += 2;
  }

  // Determine complexity level
  let level: 'low' | 'medium' | 'high' | 'very-high';
  if (score < 3) level = 'low';
  else if (score < 7) level = 'medium';
  else if (score < 15) level = 'high';
  else level = 'very-high';

  return { score, level, bottlenecks, suggestions };
};

/**
 * Provides index hints for optimizing database queries
 */
export const generateIndexHints = (
  filters: AdvancedFilters
): {
  suggestedIndexes: string[];
  queryOptimizations: string[];
} => {
  const suggestedIndexes: string[] = [];
  const queryOptimizations: string[] = [];

  // Check for composite index opportunities
  const multiFilters: string[] = [];

  if (filters.siteIds?.length) multiFilters.push('site_id');
  if (filters.equipmentTypes?.length) multiFilters.push('equipment_type');
  if (filters.makes?.length) multiFilters.push('make');
  if (filters.models?.length) multiFilters.push('model');

  if (multiFilters.length > 1) {
    suggestedIndexes.push(`idx_equipment_${multiFilters.join('_')}`);
    queryOptimizations.push('Use composite index for multi-column filtering');
  }

  // Date range indexes
  if (filters.createdAfter || filters.createdBefore) {
    suggestedIndexes.push('idx_equipment_created_at');
  }
  if (filters.updatedAfter || filters.updatedBefore) {
    suggestedIndexes.push('idx_equipment_updated_at');
  }

  // IP range indexes
  if (filters.ipRange) {
    suggestedIndexes.push('idx_equipment_ip_gist');
    queryOptimizations.push('Use GIST index for IP range queries');
  }

  // Tag indexes
  if (filters.tagFilter) {
    suggestedIndexes.push('idx_equipment_tags_gin');
    queryOptimizations.push('Use GIN index for tag array operations');
  }

  return { suggestedIndexes, queryOptimizations };
};

// =============================================================================
// PROGRESSIVE LOADING
// =============================================================================

/**
 * Manages progressive loading of filter results
 */
export class ProgressiveFilterLoader<T> {
  private config: FilterPerformanceConfig;
  private loadingPromises = new Map<string, Promise<T[]>>();

  constructor(config: Partial<FilterPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Loads data progressively in batches
   */
  async loadProgressive(
    filters: AdvancedFilters,
    loadFunction: (
      filters: AdvancedFilters,
      offset: number,
      limit: number
    ) => Promise<{
      data: T[];
      total: number;
    }>,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<T[]> {
    const key = JSON.stringify(filters);

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadPromise = this.executeProgressiveLoad(filters, loadFunction, onProgress);
    this.loadingPromises.set(key, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  /**
   * Executes progressive loading
   */
  private async executeProgressiveLoad<T>(
    filters: AdvancedFilters,
    loadFunction: (
      filters: AdvancedFilters,
      offset: number,
      limit: number
    ) => Promise<{
      data: T[];
      total: number;
    }>,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<T[]> {
    const allData: T[] = [];
    let offset = 0;
    let total = 0;

    // Load first batch to get total count
    const firstBatch = await loadFunction(filters, offset, this.config.batchSize);
    allData.push(...firstBatch.data);
    total = firstBatch.total;
    offset += this.config.batchSize;

    onProgress?.(allData.length, total);

    // Load remaining batches
    while (allData.length < total) {
      const batch = await loadFunction(filters, offset, this.config.batchSize);
      allData.push(...batch.data);
      offset += this.config.batchSize;

      onProgress?.(allData.length, total);

      // Prevent infinite loops
      if (batch.data.length === 0) break;
    }

    return allData;
  }
}

// =============================================================================
// RESULT COUNT ESTIMATION
// =============================================================================

/**
 * Estimates result count before executing full query
 */
export const estimateResultCount = async (
  filters: AdvancedFilters,
  estimateFunction: (filters: AdvancedFilters) => Promise<number>
): Promise<{
  estimatedCount: number;
  confidence: 'low' | 'medium' | 'high';
  shouldProceed: boolean;
  warnings: string[];
}> => {
  const estimatedCount = await estimateFunction(filters);
  const warnings: string[] = [];

  let confidence: 'low' | 'medium' | 'high' = 'medium';

  // Analyze complexity for confidence
  const complexity = analyzeFilterComplexity(filters);

  if (complexity.level === 'very-high') {
    confidence = 'low';
    warnings.push('Complex filters may result in inaccurate estimates');
  } else if (complexity.level === 'high') {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  // Check if count is reasonable
  const shouldProceed = estimatedCount < DEFAULT_PERFORMANCE_CONFIG.resultCountEstimationThreshold;

  if (!shouldProceed) {
    warnings.push(`Large result set (${estimatedCount} estimated) may impact performance`);
  }

  return {
    estimatedCount,
    confidence,
    shouldProceed,
    warnings,
  };
};

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

/**
 * Performance monitor for filter operations
 */
export class FilterPerformanceMonitor {
  private metrics: Array<{
    timestamp: Date;
    filters: AdvancedFilters;
    executionTime: number;
    resultCount: number;
    cacheHit: boolean;
  }> = [];

  /**
   * Records a filter operation
   */
  record(data: {
    filters: AdvancedFilters;
    executionTime: number;
    resultCount: number;
    cacheHit: boolean;
  }): void {
    this.metrics.push({
      timestamp: new Date(),
      ...data,
    });

    // Keep only recent metrics
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  /**
   * Gets performance statistics
   */
  getStatistics(): {
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
  } {
    const sortedByTime = [...this.metrics].sort((a, b) => a.executionTime - b.executionTime);
    const p95Index = Math.floor(sortedByTime.length * 0.95);

    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const slowQueries = this.metrics
      .filter(m => m.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      averageExecutionTime:
        this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / this.metrics.length || 0,
      p95ExecutionTime: sortedByTime[p95Index]?.executionTime || 0,
      averageResultCount:
        this.metrics.reduce((sum, m) => sum + m.resultCount, 0) / this.metrics.length || 0,
      cacheHitRate: this.metrics.length > 0 ? cacheHits / this.metrics.length : 0,
      totalOperations: this.metrics.length,
      slowQueries: slowQueries.map(m => ({
        filters: m.filters,
        executionTime: m.executionTime,
        timestamp: m.timestamp,
      })),
    };
  }

  /**
   * Gets performance alerts
   */
  getAlerts(): Array<{
    type: 'warning' | 'error';
    message: string;
    details: Record<string, unknown>;
  }> {
    const alerts: Array<{
      type: 'warning' | 'error';
      message: string;
      details: Record<string, unknown>;
    }> = [];
    const stats = this.getStatistics();

    if (stats.averageExecutionTime > 2000) {
      alerts.push({
        type: 'error',
        message: 'Average execution time is very high',
        details: { averageTime: stats.averageExecutionTime },
      });
    } else if (stats.averageExecutionTime > 1000) {
      alerts.push({
        type: 'warning',
        message: 'Average execution time is high',
        details: { averageTime: stats.averageExecutionTime },
      });
    }

    if (stats.cacheHitRate < 0.3) {
      alerts.push({
        type: 'warning',
        message: 'Low cache hit rate',
        details: { hitRate: stats.cacheHitRate },
      });
    }

    if (stats.slowQueries.length > 3) {
      alerts.push({
        type: 'warning',
        message: 'Multiple slow queries detected',
        details: { count: stats.slowQueries.length },
      });
    }

    return alerts;
  }
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/**
 * Processes multiple filter operations in batches
 */
export class FilterBatchProcessor {
  private config: FilterPerformanceConfig;
  private queue: Array<{
    filters: AdvancedFilters;
    resolve: (result: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];
  private processing = false;

  constructor(config: Partial<FilterPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Adds a filter operation to the batch queue
   */
  async process<T>(
    filters: AdvancedFilters,
    processor: (filters: AdvancedFilters[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        filters,
        resolve: (result: unknown) => resolve(result as T),
        reject,
      });

      if (!this.processing) {
        this.processBatch(processor);
      }
    });
  }

  /**
   * Processes queued operations in batches
   */
  private async processBatch<T>(
    processor: (filters: AdvancedFilters[]) => Promise<T[]>
  ): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.config.batchSize);
      const filtersList = batch.map(item => item.filters);

      try {
        const results = await processor(filtersList);

        batch.forEach((item, index) => {
          if (results[index]) {
            item.resolve(results[index]);
          } else {
            item.reject(new Error('No result for filter'));
          }
        });
      } catch (error) {
        batch.forEach(item => item.reject(error));
      }
    }

    this.processing = false;
  }
}

// =============================================================================
// RESULT STREAMING
// =============================================================================

/**
 * Streams filter results for real-time updates
 */
export class FilterResultStreamer<T> {
  private subscribers = new Map<string, Set<(data: T[]) => void>>();

  constructor(_config: Partial<FilterPerformanceConfig> = {}) {
    // Configuration not used in this implementation
  }

  /**
   * Subscribes to filter result updates
   */
  subscribe(filters: AdvancedFilters, callback: (data: T[]) => void): () => void {
    const key = JSON.stringify(filters);

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notifies subscribers of updated results
   */
  notify(filters: AdvancedFilters, data: T[]): void {
    const key = JSON.stringify(filters);
    const callbacks = this.subscribers.get(key);

    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Error in filter result stream callback
        }
      });
    }
  }

  /**
   * Gets active subscription count
   */
  getSubscriptionCount(): number {
    return Array.from(this.subscribers.values()).reduce(
      (total, callbacks) => total + callbacks.size,
      0
    );
  }
}

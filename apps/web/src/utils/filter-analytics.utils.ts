/**
 * Filter Analytics & Monitoring Utilities
 * Story 5.1: Advanced Filtering System
 *
 * Utilities for tracking filter usage, performance metrics,
 * and providing optimization insights.
 */

import type { AdvancedFilters } from '../types/advanced-filters';
// import type { FilterPreset, FilterHistoryEntry } from '../types/advanced-filters';
import { analyzeFilterComplexity } from './filter-performance.utils';

// =============================================================================
// ANALYTICS CONFIGURATION
// =============================================================================

/**
 * Configuration for filter analytics
 */
export interface FilterAnalyticsConfig {
  trackingEnabled: boolean;
  batchSize: number;
  flushInterval: number;
  maxStoredEvents: number;
  enableLocalStorage: boolean;
  anonymizeData: boolean;
}

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: FilterAnalyticsConfig = {
  trackingEnabled: true,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxStoredEvents: 1000,
  enableLocalStorage: true,
  anonymizeData: true,
};

// =============================================================================
// ANALYTICS EVENT TYPES
// =============================================================================

/**
 * Base interface for analytics events
 */
interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  data: Record<string, unknown>;
}

/**
 * Filter usage analytics event
 */
interface FilterUsageEvent extends AnalyticsEvent {
  type: 'filter_usage';
  data: {
    filters: AdvancedFilters;
    resultCount: number;
    executionTime: number;
    complexity: ReturnType<typeof analyzeFilterComplexity>;
    presetId?: string;
    source: 'manual' | 'preset' | 'url' | 'bookmark';
  };
}

/**
 * Filter performance analytics event
 */
interface FilterPerformanceEvent extends AnalyticsEvent {
  type: 'filter_performance';
  data: {
    filters: AdvancedFilters;
    executionTime: number;
    cacheHit: boolean;
    resultCount: number;
    queryOptimizations: string[];
    errors?: string[];
  };
}

/**
 * Filter effectiveness analytics event
 */
interface FilterEffectivenessEvent extends AnalyticsEvent {
  type: 'filter_effectiveness';
  data: {
    filters: AdvancedFilters;
    originalResultCount: number;
    filteredResultCount: number;
    reductionRatio: number;
    appliedFilterCount: number;
    mostSelectiveFilter?: string;
  };
}

/**
 * Filter behavior analytics event
 */
interface FilterBehaviorEvent extends AnalyticsEvent {
  type: 'filter_behavior';
  data: {
    action: 'apply' | 'clear' | 'modify' | 'preset_save' | 'preset_load' | 'share';
    filters?: AdvancedFilters;
    previousFilters?: AdvancedFilters;
    timeSinceLastAction: number;
    interactionPath: string[];
  };
}

/**
 * Union type for all analytics events
 */
type FilterAnalyticsEvent =
  | FilterUsageEvent
  | FilterPerformanceEvent
  | FilterEffectivenessEvent
  | FilterBehaviorEvent;

// =============================================================================
// ANALYTICS TRACKER
// =============================================================================

/**
 * Main analytics tracker for filter operations
 */
export class FilterAnalyticsTracker {
  private config: FilterAnalyticsConfig;
  private events: FilterAnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushTimer?: NodeJS.Timeout;
  private eventBuffer: FilterAnalyticsEvent[] = [];

  constructor(config: Partial<FilterAnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    this.sessionId = this.generateSessionId();

    if (this.config.trackingEnabled) {
      this.startFlushTimer();
      this.loadStoredEvents();
    }
  }

  /**
   * Sets the current user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Tracks filter usage
   */
  trackFilterUsage(data: {
    filters: AdvancedFilters;
    resultCount: number;
    executionTime: number;
    presetId?: string;
    source?: 'manual' | 'preset' | 'url' | 'bookmark';
  }): void {
    if (!this.config.trackingEnabled) return;

    const complexity = analyzeFilterComplexity(data.filters);

    const event: FilterUsageEvent = {
      id: this.generateEventId(),
      type: 'filter_usage',
      timestamp: new Date(),
      userId: this.config.anonymizeData ? undefined : this.userId,
      sessionId: this.sessionId,
      data: {
        ...data,
        complexity,
        source: data.source || 'manual',
      },
    };

    this.addEvent(event);
  }

  /**
   * Tracks filter performance metrics
   */
  trackFilterPerformance(data: {
    filters: AdvancedFilters;
    executionTime: number;
    cacheHit: boolean;
    resultCount: number;
    queryOptimizations: string[];
    errors?: string[];
  }): void {
    if (!this.config.trackingEnabled) return;

    const event: FilterPerformanceEvent = {
      id: this.generateEventId(),
      type: 'filter_performance',
      timestamp: new Date(),
      userId: this.config.anonymizeData ? undefined : this.userId,
      sessionId: this.sessionId,
      data,
    };

    this.addEvent(event);
  }

  /**
   * Tracks filter effectiveness
   */
  trackFilterEffectiveness(data: {
    filters: AdvancedFilters;
    originalResultCount: number;
    filteredResultCount: number;
  }): void {
    if (!this.config.trackingEnabled) return;

    const reductionRatio =
      data.originalResultCount > 0
        ? (data.originalResultCount - data.filteredResultCount) / data.originalResultCount
        : 0;

    const appliedFilterCount = this.countAppliedFilters(data.filters);
    const mostSelectiveFilter = this.findMostSelectiveFilter(data.filters);

    const event: FilterEffectivenessEvent = {
      id: this.generateEventId(),
      type: 'filter_effectiveness',
      timestamp: new Date(),
      userId: this.config.anonymizeData ? undefined : this.userId,
      sessionId: this.sessionId,
      data: {
        ...data,
        reductionRatio,
        appliedFilterCount,
        mostSelectiveFilter,
      },
    };

    this.addEvent(event);
  }

  /**
   * Tracks user filter behavior
   */
  trackFilterBehavior(data: {
    action: 'apply' | 'clear' | 'modify' | 'preset_save' | 'preset_load' | 'share';
    filters?: AdvancedFilters;
    previousFilters?: AdvancedFilters;
    interactionPath?: string[];
  }): void {
    if (!this.config.trackingEnabled) return;

    const timeSinceLastAction = this.getTimeSinceLastAction();

    const event: FilterBehaviorEvent = {
      id: this.generateEventId(),
      type: 'filter_behavior',
      timestamp: new Date(),
      userId: this.config.anonymizeData ? undefined : this.userId,
      sessionId: this.sessionId,
      data: {
        ...data,
        timeSinceLastAction,
        interactionPath: data.interactionPath || [],
      },
    };

    this.addEvent(event);
  }

  /**
   * Gets usage insights for optimization
   */
  getUsageInsights(): {
    totalUsage: number;
    averageExecutionTime: number;
    mostUsedFilters: Array<{ filterType: string; count: number }>;
    performanceBottlenecks: string[];
    optimizationSuggestions: string[];
  } {
    const usageEvents = this.events.filter(e => e.type === 'filter_usage') as FilterUsageEvent[];
    const performanceEvents = this.events.filter(
      e => e.type === 'filter_performance'
    ) as FilterPerformanceEvent[];

    const filterTypeCounts: Record<string, number> = {};
    let totalExecutionTime = 0;
    const bottlenecks: string[] = [];
    const suggestions = new Set<string>();

    // Analyze usage patterns
    usageEvents.forEach(event => {
      totalExecutionTime += event.data.executionTime;

      // Count filter types
      Object.keys(event.data.filters).forEach(filterType => {
        if (event.data.filters[filterType as keyof AdvancedFilters]) {
          filterTypeCounts[filterType] = (filterTypeCounts[filterType] || 0) + 1;
        }
      });

      // Collect suggestions from complexity analysis
      event.data.complexity.suggestions.forEach(suggestion => {
        suggestions.add(suggestion);
      });

      // Identify bottlenecks
      if (event.data.executionTime > 2000) {
        bottlenecks.push(`Slow query with complexity level: ${event.data.complexity.level}`);
      }
    });

    // Analyze performance patterns
    performanceEvents.forEach(event => {
      if (!event.data.cacheHit && event.data.executionTime > 1000) {
        bottlenecks.push('Cache miss on slow query');
        suggestions.add('Review caching strategy for complex filters');
      }

      event.data.queryOptimizations.forEach(optimization => {
        suggestions.add(optimization);
      });
    });

    const mostUsedFilters = Object.entries(filterTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([filterType, count]) => ({ filterType, count }));

    return {
      totalUsage: usageEvents.length,
      averageExecutionTime: usageEvents.length > 0 ? totalExecutionTime / usageEvents.length : 0,
      mostUsedFilters,
      performanceBottlenecks: Array.from(new Set(bottlenecks)),
      optimizationSuggestions: Array.from(suggestions),
    };
  }

  /**
   * Gets popular filter combinations
   */
  getPopularCombinations(limit = 10): Array<{
    filters: Partial<AdvancedFilters>;
    usageCount: number;
    averageExecutionTime: number;
    averageResultCount: number;
  }> {
    const usageEvents = this.events.filter(e => e.type === 'filter_usage') as FilterUsageEvent[];
    const combinations: Map<
      string,
      {
        filters: Partial<AdvancedFilters>;
        usageCount: number;
        totalExecutionTime: number;
        totalResultCount: number;
      }
    > = new Map();

    usageEvents.forEach(event => {
      const key = this.getFilterCombinationKey(event.data.filters);
      const existing = combinations.get(key);

      if (existing) {
        existing.usageCount++;
        existing.totalExecutionTime += event.data.executionTime;
        existing.totalResultCount += event.data.resultCount;
      } else {
        combinations.set(key, {
          filters: this.getSignificantFilters(event.data.filters),
          usageCount: 1,
          totalExecutionTime: event.data.executionTime,
          totalResultCount: event.data.resultCount,
        });
      }
    });

    return Array.from(combinations.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
      .map(combo => ({
        filters: combo.filters,
        usageCount: combo.usageCount,
        averageExecutionTime: combo.totalExecutionTime / combo.usageCount,
        averageResultCount: combo.totalResultCount / combo.usageCount,
      }));
  }

  /**
   * Identifies underperforming filters
   */
  getUnderperformingFilters(): Array<{
    filterType: string;
    averageExecutionTime: number;
    cacheHitRate: number;
    issueCount: number;
    recommendations: string[];
  }> {
    const performanceEvents = this.events.filter(
      e => e.type === 'filter_performance'
    ) as FilterPerformanceEvent[];
    const filterPerformance: Map<
      string,
      {
        totalTime: number;
        cacheHits: number;
        totalQueries: number;
        issues: string[];
      }
    > = new Map();

    performanceEvents.forEach(event => {
      Object.keys(event.data.filters).forEach(filterType => {
        if (event.data.filters[filterType as keyof AdvancedFilters]) {
          const existing = filterPerformance.get(filterType) || {
            totalTime: 0,
            cacheHits: 0,
            totalQueries: 0,
            issues: [],
          };

          existing.totalTime += event.data.executionTime;
          existing.totalQueries++;
          if (event.data.cacheHit) existing.cacheHits++;
          if (event.data.errors) existing.issues.push(...event.data.errors);

          filterPerformance.set(filterType, existing);
        }
      });
    });

    return Array.from(filterPerformance.entries())
      .map(([filterType, stats]) => ({
        filterType,
        averageExecutionTime: stats.totalTime / stats.totalQueries,
        cacheHitRate: stats.cacheHits / stats.totalQueries,
        issueCount: stats.issues.length,
        recommendations: this.generateFilterRecommendations(filterType, stats),
      }))
      .filter(
        filter =>
          filter.averageExecutionTime > 1000 || filter.cacheHitRate < 0.3 || filter.issueCount > 0
      )
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime);
  }

  /**
   * Exports analytics data
   */
  exportAnalytics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    } else {
      return JSON.stringify(
        {
          sessionId: this.sessionId,
          userId: this.userId,
          exportedAt: new Date().toISOString(),
          events: this.events,
          insights: this.getUsageInsights(),
        },
        null,
        2
      );
    }
  }

  /**
   * Clears all stored analytics data
   */
  clear(): void {
    this.events = [];
    this.eventBuffer = [];
    if (this.config.enableLocalStorage) {
      localStorage.removeItem('filter-analytics-events');
    }
  }

  /**
   * Adds an event to the tracking system
   */
  private addEvent(event: FilterAnalyticsEvent): void {
    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flushEvents();
    }

    // Maintain storage limits
    if (this.events.length >= this.config.maxStoredEvents) {
      this.events = this.events.slice(-this.config.maxStoredEvents * 0.8);
    }
  }

  /**
   * Flushes buffered events to storage
   */
  private flushEvents(): void {
    if (this.eventBuffer.length === 0) return;

    this.events.push(...this.eventBuffer);
    this.eventBuffer = [];

    if (this.config.enableLocalStorage) {
      this.saveEventsToStorage();
    }

    // Send to analytics service (placeholder)
    this.sendToAnalyticsService(this.events.slice(-this.config.batchSize));
  }

  /**
   * Starts the periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Counts applied filters in a filter configuration
   */
  private countAppliedFilters(filters: AdvancedFilters): number {
    let count = 0;

    if (filters.siteIds?.length) count++;
    if (filters.cellTypes?.length) count++;
    if (filters.equipmentTypes?.length) count++;
    if (filters.makes?.length) count++;
    if (filters.models?.length) count++;
    if (filters.createdAfter || filters.createdBefore) count++;
    if (filters.updatedAfter || filters.updatedBefore) count++;
    if (filters.ipRange) count++;
    if (filters.tagFilter) count++;
    if (filters.searchQuery) count++;

    return count;
  }

  /**
   * Finds the most selective filter (one that reduces results the most)
   */
  private findMostSelectiveFilter(filters: AdvancedFilters): string | undefined {
    // This is a simplified implementation
    // In practice, you'd analyze which filter reduces results most effectively
    const activeFilters = Object.keys(filters).filter(key => filters[key as keyof AdvancedFilters]);

    return activeFilters[0]; // Placeholder
  }

  /**
   * Gets time since last action for behavior analysis
   */
  private getTimeSinceLastAction(): number {
    const lastEvent = this.events[this.events.length - 1];
    return lastEvent ? Date.now() - lastEvent.timestamp.getTime() : 0;
  }

  /**
   * Generates a key for filter combination identification
   */
  private getFilterCombinationKey(filters: AdvancedFilters): string {
    const significantFilters = this.getSignificantFilters(filters);
    return JSON.stringify(significantFilters, Object.keys(significantFilters).sort());
  }

  /**
   * Extracts significant filters (non-empty ones) for analysis
   */
  private getSignificantFilters(filters: AdvancedFilters): Partial<AdvancedFilters> {
    const significant: Partial<AdvancedFilters> = {};

    if (filters.siteIds?.length) significant.siteIds = filters.siteIds;
    if (filters.cellTypes?.length) significant.cellTypes = filters.cellTypes;
    if (filters.equipmentTypes?.length) significant.equipmentTypes = filters.equipmentTypes;
    if (filters.makes?.length) significant.makes = filters.makes;
    if (filters.models?.length) significant.models = filters.models;
    if (filters.createdAfter) significant.createdAfter = filters.createdAfter;
    if (filters.createdBefore) significant.createdBefore = filters.createdBefore;
    if (filters.ipRange) significant.ipRange = filters.ipRange;
    if (filters.tagFilter) significant.tagFilter = filters.tagFilter;
    if (filters.searchQuery) significant.searchQuery = filters.searchQuery;

    return significant;
  }

  /**
   * Generates recommendations for underperforming filters
   */
  private generateFilterRecommendations(
    filterType: string,
    stats: {
      totalTime: number;
      cacheHits: number;
      totalQueries: number;
      issues: string[];
    }
  ): string[] {
    const recommendations: string[] = [];

    if (stats.totalTime / stats.totalQueries > 2000) {
      recommendations.push(`${filterType} queries are slow - consider database indexing`);
    }

    if (stats.cacheHits / stats.totalQueries < 0.3) {
      recommendations.push(`${filterType} has low cache hit rate - review caching strategy`);
    }

    if (stats.issues.length > 0) {
      recommendations.push(`${filterType} has recurring issues - investigate error patterns`);
    }

    return recommendations;
  }

  /**
   * Loads stored events from localStorage
   */
  private loadStoredEvents(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = localStorage.getItem('filter-analytics-events');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.map((event: Record<string, unknown>) => ({
          ...event,
          timestamp: new Date(event.timestamp as string | number | Date),
        }));
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error);
    }
  }

  /**
   * Saves events to localStorage
   */
  private saveEventsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const toStore = this.events.slice(-this.config.maxStoredEvents * 0.8);
      localStorage.setItem('filter-analytics-events', JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save analytics events to storage:', error);
    }
  }

  /**
   * Sends events to analytics service (placeholder)
   */
  private sendToAnalyticsService(events: FilterAnalyticsEvent[]): void {
    // Placeholder for sending to external analytics service
    console.debug('Analytics events:', events);
  }

  /**
   * Exports analytics data as CSV
   */
  private exportAsCSV(): string {
    const headers = ['Event ID', 'Type', 'Timestamp', 'User ID', 'Session ID', 'Data'];

    const rows = this.events.map(event => [
      event.id,
      event.type,
      event.timestamp.toISOString(),
      event.userId || '',
      event.sessionId,
      JSON.stringify(event.data),
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
  }
}

// =============================================================================
// SINGLETON ANALYTICS INSTANCE
// =============================================================================

/**
 * Global analytics tracker instance
 */
export const filterAnalytics = new FilterAnalyticsTracker();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Tracks filter usage with global analytics instance
 */
export const trackFilterUsage = (
  data: Parameters<FilterAnalyticsTracker['trackFilterUsage']>[0]
) => {
  filterAnalytics.trackFilterUsage(data);
};

/**
 * Tracks filter performance with global analytics instance
 */
export const trackFilterPerformance = (
  data: Parameters<FilterAnalyticsTracker['trackFilterPerformance']>[0]
) => {
  filterAnalytics.trackFilterPerformance(data);
};

/**
 * Tracks filter effectiveness with global analytics instance
 */
export const trackFilterEffectiveness = (
  data: Parameters<FilterAnalyticsTracker['trackFilterEffectiveness']>[0]
) => {
  filterAnalytics.trackFilterEffectiveness(data);
};

/**
 * Tracks filter behavior with global analytics instance
 */
export const trackFilterBehavior = (
  data: Parameters<FilterAnalyticsTracker['trackFilterBehavior']>[0]
) => {
  filterAnalytics.trackFilterBehavior(data);
};

/**
 * Gets usage insights from global analytics instance
 */
export const getFilterUsageInsights = () => {
  return filterAnalytics.getUsageInsights();
};

/**
 * Gets popular filter combinations from global analytics instance
 */
export const getPopularFilterCombinations = (limit?: number) => {
  return filterAnalytics.getPopularCombinations(limit);
};

/**
 * Gets underperforming filters from global analytics instance
 */
export const getUnderperformingFilters = () => {
  return filterAnalytics.getUnderperformingFilters();
};

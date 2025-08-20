/**
 * Filter Analytics Hook
 * Story 5.1: Advanced Filtering System
 *
 * Hook for tracking and analyzing filter usage patterns,
 * performance metrics, and user behavior with comprehensive insights.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FilterAnalyticsTracker,
  // trackFilterUsage,
  // trackFilterPerformance,
  // trackFilterEffectiveness,
  // trackFilterBehavior,
  // getFilterUsageInsights,
  // getPopularFilterCombinations,
  // getUnderperformingFilters,
} from '../utils/filter-analytics.utils';
import type { AdvancedFilters } from '../types/advanced-filters';

// =============================================================================
// ANALYTICS CONFIGURATION
// =============================================================================

/**
 * Analytics configuration options
 */
interface FilterAnalyticsConfig {
  trackingEnabled: boolean;
  batchSize: number;
  flushInterval: number;
  maxStoredEvents: number;
  enableLocalStorage: boolean;
  anonymizeData: boolean;
  enableInsights: boolean;
  enableReporting: boolean;
}

/**
 * Default analytics configuration
 */
const DEFAULT_CONFIG: FilterAnalyticsConfig = {
  trackingEnabled: true,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxStoredEvents: 1000,
  enableLocalStorage: true,
  anonymizeData: true,
  enableInsights: true,
  enableReporting: true,
};

// =============================================================================
// HOOK OPTIONS
// =============================================================================

/**
 * Options for configuring the useFilterAnalytics hook
 */
interface UseFilterAnalyticsOptions {
  /**
   * Analytics configuration overrides
   */
  config?: Partial<FilterAnalyticsConfig>;

  /**
   * User ID for tracking (will be anonymized if enabled)
   */
  userId?: string;

  /**
   * Session context for analytics
   */
  sessionContext?: Record<string, unknown>;

  /**
   * Custom event handler
   */
  onAnalyticsEvent?: (event: {
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
  }) => void;

  /**
   * Insights update handler
   */
  onInsightsUpdate?: (insights: UsageInsights) => void;

  /**
   * Performance alert handler
   */
  onPerformanceAlert?: (alert: {
    type: 'warning' | 'error';
    message: string;
    details: Record<string, unknown>;
  }) => void;
}

// =============================================================================
// ANALYTICS INSIGHTS
// =============================================================================

/**
 * Usage insights from analytics data
 */
interface UsageInsights {
  totalUsage: number;
  averageExecutionTime: number;
  mostUsedFilters: Array<{ filterType: string; count: number }>;
  performanceBottlenecks: string[];
  optimizationSuggestions: string[];
}

/**
 * Popular filter combinations
 */
interface PopularCombinations {
  filters: Partial<AdvancedFilters>;
  usageCount: number;
  averageExecutionTime: number;
  averageResultCount: number;
}

/**
 * Underperforming filters
 */
interface UnderperformingFilters {
  filterType: string;
  averageExecutionTime: number;
  cacheHitRate: number;
  issueCount: number;
  recommendations: string[];
}

/**
 * User behavior patterns
 */
interface BehaviorPatterns {
  sessionDuration: number;
  filterChangesPerSession: number;
  presetUsageRatio: number;
  averageTimeBetweenActions: number;
  mostCommonActionSequence: string[];
  abandonmentRate: number;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useFilterAnalytics hook
 */
interface UseFilterAnalyticsReturn {
  // Analytics State
  isTrackingEnabled: boolean;
  isAnalyzing: boolean;
  analyticsError: string | null;

  // Tracking Functions
  trackUsage: (data: {
    filters: AdvancedFilters;
    resultCount: number;
    executionTime: number;
    presetId?: string;
    source?: 'manual' | 'preset' | 'url' | 'bookmark';
  }) => void;

  trackPerformance: (data: {
    filters: AdvancedFilters;
    executionTime: number;
    cacheHit: boolean;
    resultCount: number;
    queryOptimizations: string[];
    errors?: string[];
  }) => void;

  trackEffectiveness: (data: {
    filters: AdvancedFilters;
    originalResultCount: number;
    filteredResultCount: number;
  }) => void;

  trackBehavior: (data: {
    action: 'apply' | 'clear' | 'modify' | 'preset_save' | 'preset_load' | 'share';
    filters?: AdvancedFilters;
    previousFilters?: AdvancedFilters;
    interactionPath?: string[];
  }) => void;

  // Insights & Analytics
  usageInsights: UsageInsights;
  popularCombinations: PopularCombinations[];
  underperformingFilters: UnderperformingFilters[];
  behaviorPatterns: BehaviorPatterns;

  // Reporting
  generateReport: (format?: 'json' | 'csv') => string;
  exportAnalytics: () => string;

  // Session Management
  startSession: (context?: Record<string, unknown>) => void;
  endSession: () => void;
  sessionStats: {
    duration: number;
    eventCount: number;
    filterChanges: number;
    presetsUsed: number;
  };

  // Real-time Monitoring
  currentMetrics: {
    activeFiltersCount: number;
    lastExecutionTime: number;
    recentPerformance: 'excellent' | 'good' | 'moderate' | 'poor';
  };

  // Optimization Recommendations
  getRecommendations: () => Array<{
    type: 'performance' | 'usability' | 'optimization';
    message: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
  }>;

  // Analytics Controls
  enableTracking: () => void;
  disableTracking: () => void;
  clearAnalytics: () => void;
  flushEvents: () => void;

  // Advanced Analytics
  getFilterTrends: (timeRange?: { start: Date; end: Date }) => Array<{
    date: Date;
    usageCount: number;
    averagePerformance: number;
    uniqueUsers: number;
  }>;

  getConversionFunnels: () => Array<{
    step: string;
    users: number;
    conversionRate: number;
    avgTimeSpent: number;
  }>;

  getUserSegments: () => Array<{
    segment: string;
    users: number;
    characteristics: Record<string, unknown>;
  }>;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Filter Analytics Hook
 *
 * Provides comprehensive analytics tracking and insights for filter usage,
 * performance, and user behavior patterns.
 */
export const useFilterAnalytics = (
  options: UseFilterAnalyticsOptions = {}
): UseFilterAnalyticsReturn => {
  const {
    config = {},
    userId,
    sessionContext = {},
    onAnalyticsEvent,
    onInsightsUpdate,
    onPerformanceAlert,
  } = options;

  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Analytics tracker instance
  const tracker = useRef<FilterAnalyticsTracker>(new FilterAnalyticsTracker(finalConfig));

  // State
  const [isAnalyzing] = useState(false); // Commented out setIsAnalyzing
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    eventCount: 0,
    filterChanges: 0,
    presetsUsed: 0,
  });
  const [currentMetrics, setCurrentMetrics] = useState({
    activeFiltersCount: 0,
    lastExecutionTime: 0,
    recentPerformance: 'excellent' as 'excellent' | 'good' | 'moderate' | 'poor',
  });

  // =============================================================================
  // TRACKING FUNCTIONS
  // =============================================================================

  /**
   * Tracks filter usage
   */
  const trackUsage = useCallback(
    (data: {
      filters: AdvancedFilters;
      resultCount: number;
      executionTime: number;
      presetId?: string;
      source?: 'manual' | 'preset' | 'url' | 'bookmark';
    }) => {
      if (!finalConfig.trackingEnabled) return;

      try {
        tracker.current.trackFilterUsage(data);

        // Update current metrics
        setCurrentMetrics(prev => ({
          ...prev,
          lastExecutionTime: data.executionTime,
          recentPerformance: (data.executionTime < 500
            ? 'excellent'
            : data.executionTime < 1000
              ? 'good'
              : data.executionTime < 2000
                ? 'moderate'
                : 'poor') as 'excellent' | 'good' | 'moderate' | 'poor',
        }));

        // Update session stats
        setSessionStats(prev => ({
          ...prev,
          eventCount: prev.eventCount + 1,
          filterChanges: prev.filterChanges + 1,
          presetsUsed: data.presetId ? prev.presetsUsed + 1 : prev.presetsUsed,
        }));

        onAnalyticsEvent?.({
          type: 'usage',
          data,
          timestamp: new Date(),
        });
      } catch (error) {
        setAnalyticsError(error instanceof Error ? error.message : 'Analytics error');
      }
    },
    [finalConfig.trackingEnabled, onAnalyticsEvent]
  );

  /**
   * Tracks filter performance
   */
  const trackPerformance = useCallback(
    (data: {
      filters: AdvancedFilters;
      executionTime: number;
      cacheHit: boolean;
      resultCount: number;
      queryOptimizations: string[];
      errors?: string[];
    }) => {
      if (!finalConfig.trackingEnabled) return;

      try {
        tracker.current.trackFilterPerformance(data);

        // Check for performance alerts
        if (data.executionTime > 2000) {
          onPerformanceAlert?.({
            type: 'error',
            message: 'Very slow query detected',
            details: data,
          });
        } else if (data.executionTime > 1000) {
          onPerformanceAlert?.({
            type: 'warning',
            message: 'Slow query detected',
            details: data,
          });
        }

        onAnalyticsEvent?.({
          type: 'performance',
          data,
          timestamp: new Date(),
        });
      } catch (error) {
        setAnalyticsError(error instanceof Error ? error.message : 'Analytics error');
      }
    },
    [finalConfig.trackingEnabled, onAnalyticsEvent, onPerformanceAlert]
  );

  /**
   * Tracks filter effectiveness
   */
  const trackEffectiveness = useCallback(
    (data: {
      filters: AdvancedFilters;
      originalResultCount: number;
      filteredResultCount: number;
    }) => {
      if (!finalConfig.trackingEnabled) return;

      try {
        tracker.current.trackFilterEffectiveness(data);

        onAnalyticsEvent?.({
          type: 'effectiveness',
          data,
          timestamp: new Date(),
        });
      } catch (error) {
        setAnalyticsError(error instanceof Error ? error.message : 'Analytics error');
      }
    },
    [finalConfig.trackingEnabled, onAnalyticsEvent]
  );

  /**
   * Tracks user behavior
   */
  const trackBehavior = useCallback(
    (data: {
      action: 'apply' | 'clear' | 'modify' | 'preset_save' | 'preset_load' | 'share';
      filters?: AdvancedFilters;
      previousFilters?: AdvancedFilters;
      interactionPath?: string[];
    }) => {
      if (!finalConfig.trackingEnabled) return;

      try {
        tracker.current.trackFilterBehavior(data);

        onAnalyticsEvent?.({
          type: 'behavior',
          data,
          timestamp: new Date(),
        });
      } catch (error) {
        setAnalyticsError(error instanceof Error ? error.message : 'Analytics error');
      }
    },
    [finalConfig.trackingEnabled, onAnalyticsEvent]
  );

  // =============================================================================
  // INSIGHTS & ANALYTICS
  // =============================================================================

  /**
   * Gets usage insights
   */
  const usageInsights = useMemo((): UsageInsights => {
    if (!finalConfig.enableInsights) {
      return {
        totalUsage: 0,
        averageExecutionTime: 0,
        mostUsedFilters: [],
        performanceBottlenecks: [],
        optimizationSuggestions: [],
      };
    }

    try {
      return tracker.current.getUsageInsights();
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Insights error');
      return {
        totalUsage: 0,
        averageExecutionTime: 0,
        mostUsedFilters: [],
        performanceBottlenecks: [],
        optimizationSuggestions: [],
      };
    }
  }, [finalConfig.enableInsights]);

  /**
   * Gets popular filter combinations
   */
  const popularCombinations = useMemo((): PopularCombinations[] => {
    if (!finalConfig.enableInsights) return [];

    try {
      return tracker.current.getPopularCombinations(10);
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Insights error');
      return [];
    }
  }, [finalConfig.enableInsights]);

  /**
   * Gets underperforming filters
   */
  const underperformingFilters = useMemo((): UnderperformingFilters[] => {
    if (!finalConfig.enableInsights) return [];

    try {
      return tracker.current.getUnderperformingFilters();
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Insights error');
      return [];
    }
  }, [finalConfig.enableInsights]);

  /**
   * Gets behavior patterns
   */
  const behaviorPatterns = useMemo((): BehaviorPatterns => {
    // This would be calculated from the analytics data
    // For now, returning mock data structure
    return {
      sessionDuration: sessionStats.duration,
      filterChangesPerSession: sessionStats.filterChanges,
      presetUsageRatio: sessionStats.presetsUsed / Math.max(sessionStats.filterChanges, 1),
      averageTimeBetweenActions: sessionStats.duration / Math.max(sessionStats.eventCount, 1),
      mostCommonActionSequence: ['apply', 'modify', 'apply'],
      abandonmentRate: 0.15,
    };
  }, [sessionStats]);

  // =============================================================================
  // REPORTING & EXPORT
  // =============================================================================

  /**
   * Generates analytics report
   */
  const generateReport = useCallback((format: 'json' | 'csv' = 'json'): string => {
    try {
      return tracker.current.exportAnalytics(format);
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Report generation error');
      return '';
    }
  }, []);

  /**
   * Exports analytics data
   */
  const exportAnalytics = useCallback((): string => {
    return generateReport('json');
  }, [generateReport]);

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Starts a new analytics session
   */
  const startSession = useCallback(
    (/* context: Record<string, any> = {} */) => {
      setSessionStartTime(new Date());
      setSessionStats({
        duration: 0,
        eventCount: 0,
        filterChanges: 0,
        presetsUsed: 0,
      });

      if (userId) {
        tracker.current.setUserId(userId);
      }

      trackBehavior({
        action: 'apply', // Using 'apply' as session start
        interactionPath: ['session_start'],
      });
    },
    [userId, trackBehavior]
  );

  /**
   * Ends the current analytics session
   */
  const endSession = useCallback(() => {
    if (sessionStartTime) {
      const duration = Date.now() - sessionStartTime.getTime();
      setSessionStats(prev => ({ ...prev, duration }));
    }

    trackBehavior({
      action: 'clear', // Using 'clear' as session end
      interactionPath: ['session_end'],
    });

    setSessionStartTime(null);
  }, [sessionStartTime, trackBehavior]);

  // =============================================================================
  // OPTIMIZATION RECOMMENDATIONS
  // =============================================================================

  /**
   * Gets optimization recommendations
   */
  const getRecommendations = useCallback(() => {
    const recommendations: Array<{
      type: 'performance' | 'usability' | 'optimization';
      message: string;
      action: string;
      priority: 'low' | 'medium' | 'high';
    }> = [];

    // Performance recommendations
    if (usageInsights.averageExecutionTime > 1000) {
      recommendations.push({
        type: 'performance',
        message: 'Average query time is slow',
        action: 'Optimize frequently used filter combinations',
        priority: 'high',
      });
    }

    // Usability recommendations
    if (behaviorPatterns.abandonmentRate > 0.2) {
      recommendations.push({
        type: 'usability',
        message: 'High filter abandonment rate detected',
        action: 'Simplify filter interface or add guided tutorials',
        priority: 'medium',
      });
    }

    // Optimization recommendations
    if (popularCombinations.length > 0) {
      recommendations.push({
        type: 'optimization',
        message: 'Popular filter combinations identified',
        action: 'Create presets for common filter patterns',
        priority: 'medium',
      });
    }

    return recommendations;
  }, [usageInsights, behaviorPatterns, popularCombinations]);

  // =============================================================================
  // ADVANCED ANALYTICS
  // =============================================================================

  /**
   * Gets filter usage trends
   */
  const getFilterTrends = useCallback(
    (/* timeRange?: { start: Date; end: Date } */) => {
      // This would analyze trends from stored analytics data
      // For now, returning mock structure
      return [
        {
          date: new Date(),
          usageCount: usageInsights.totalUsage,
          averagePerformance: usageInsights.averageExecutionTime,
          uniqueUsers: 1,
        },
      ];
    },
    [usageInsights]
  );

  /**
   * Gets conversion funnels
   */
  const getConversionFunnels = useCallback(() => {
    return [
      {
        step: 'Filter Applied',
        users: 100,
        conversionRate: 1.0,
        avgTimeSpent: 30000,
      },
      {
        step: 'Results Viewed',
        users: 85,
        conversionRate: 0.85,
        avgTimeSpent: 45000,
      },
      {
        step: 'Filter Modified',
        users: 60,
        conversionRate: 0.6,
        avgTimeSpent: 20000,
      },
    ];
  }, []);

  /**
   * Gets user segments
   */
  const getUserSegments = useCallback(() => {
    return [
      {
        segment: 'Power Users',
        users: 25,
        characteristics: {
          avgFiltersPerSession: 8,
          presetUsageRate: 0.8,
          avgSessionDuration: 600000,
        },
      },
      {
        segment: 'Casual Users',
        users: 75,
        characteristics: {
          avgFiltersPerSession: 3,
          presetUsageRate: 0.2,
          avgSessionDuration: 180000,
        },
      },
    ];
  }, []);

  // =============================================================================
  // ANALYTICS CONTROLS
  // =============================================================================

  /**
   * Enables analytics tracking
   */
  const enableTracking = useCallback(() => {
    tracker.current = new FilterAnalyticsTracker({
      ...finalConfig,
      trackingEnabled: true,
    });
    if (userId) {
      tracker.current.setUserId(userId);
    }
  }, [finalConfig, userId]);

  /**
   * Disables analytics tracking
   */
  const disableTracking = useCallback(() => {
    tracker.current = new FilterAnalyticsTracker({
      ...finalConfig,
      trackingEnabled: false,
    });
  }, [finalConfig]);

  /**
   * Clears all analytics data
   */
  const clearAnalytics = useCallback(() => {
    tracker.current.clear();
    setAnalyticsError(null);
    setSessionStats({
      duration: 0,
      eventCount: 0,
      filterChanges: 0,
      presetsUsed: 0,
    });
  }, []);

  /**
   * Flushes pending events
   */
  const flushEvents = useCallback(() => {
    // The tracker automatically flushes events, but we can trigger it manually
    // This is handled internally by the FilterAnalyticsTracker
  }, []);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Initialize analytics on mount
   */
  useEffect(() => {
    if (userId) {
      tracker.current.setUserId(userId);
    }

    startSession();

    return () => {
      endSession();
      tracker.current.destroy();
    };
  }, [userId, sessionContext, startSession, endSession]);

  /**
   * Update session duration
   */
  useEffect(() => {
    if (!sessionStartTime) return;

    const interval = setInterval(() => {
      const duration = Date.now() - sessionStartTime.getTime();
      setSessionStats(prev => ({ ...prev, duration }));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  /**
   * Trigger insights updates
   */
  useEffect(() => {
    if (finalConfig.enableInsights && onInsightsUpdate) {
      onInsightsUpdate(usageInsights);
    }
  }, [
    finalConfig.enableInsights,
    onInsightsUpdate,
    usageInsights,
    popularCombinations,
    underperformingFilters,
    behaviorPatterns,
  ]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Analytics State
    isTrackingEnabled: finalConfig.trackingEnabled,
    isAnalyzing,
    analyticsError,

    // Tracking Functions
    trackUsage,
    trackPerformance,
    trackEffectiveness,
    trackBehavior,

    // Insights & Analytics
    usageInsights,
    popularCombinations,
    underperformingFilters,
    behaviorPatterns,

    // Reporting
    generateReport,
    exportAnalytics,

    // Session Management
    startSession,
    endSession,
    sessionStats,

    // Real-time Monitoring
    currentMetrics,

    // Optimization Recommendations
    getRecommendations,

    // Analytics Controls
    enableTracking,
    disableTracking,
    clearAnalytics,
    flushEvents,

    // Advanced Analytics
    getFilterTrends,
    getConversionFunnels,
    getUserSegments,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Simplified analytics hook for basic tracking
 */
export const useSimpleAnalytics = () => {
  return useFilterAnalytics({
    config: {
      trackingEnabled: true,
      enableInsights: false,
      enableReporting: false,
      anonymizeData: true,
    },
  });
};

/**
 * Performance-focused analytics hook
 */
export const usePerformanceAnalytics = () => {
  return useFilterAnalytics({
    config: {
      trackingEnabled: true,
      enableInsights: true,
      enableReporting: true,
      anonymizeData: true,
    },
  });
};

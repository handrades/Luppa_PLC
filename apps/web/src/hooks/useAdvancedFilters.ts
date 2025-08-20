/**
 * Advanced Filters Hook
 * Story 5.1: Advanced Filtering System
 *
 * Main hook for managing advanced filter state, validation, and operations.
 * Provides a complete interface for filter management with performance optimization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdvancedFiltersStore } from '../stores/advanced-filters.store';
import { validateAdvancedFilters } from '../validation/filter.schemas';
import { analyzeFilterComplexity } from '../utils/filter-performance.utils';
import { trackFilterEffectiveness, trackFilterUsage } from '../utils/filter-analytics.utils';
import { parseFiltersFromURL, updateBrowserURL } from '../utils/filter-url.utils';
import type { AdvancedFilters, FilterValidationResult } from '../types/advanced-filters';

// =============================================================================
// HOOK OPTIONS INTERFACE
// =============================================================================

/**
 * Options for configuring the useAdvancedFilters hook
 */
interface UseAdvancedFiltersOptions {
  /**
   * Whether to sync filter state with URL parameters
   * @default true
   */
  syncWithURL?: boolean;

  /**
   * Whether to track filter analytics
   * @default true
   */
  enableAnalytics?: boolean;

  /**
   * Whether to validate filters on every change
   * @default true
   */
  validateOnChange?: boolean;

  /**
   * Debounce delay for filter changes in milliseconds
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Whether to automatically apply default filters on mount
   * @default true
   */
  applyDefaultFilters?: boolean;

  /**
   * Custom filter change handler
   */
  onFiltersChange?: (filters: AdvancedFilters) => void;

  /**
   * Custom filter application handler
   */
  onFiltersApply?: (filters: AdvancedFilters) => void;

  /**
   * Custom filter validation error handler
   */
  onValidationError?: (errors: FilterValidationResult['fieldErrors']) => void;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useAdvancedFilters hook
 */
interface UseAdvancedFiltersReturn {
  // Filter State
  filters: AdvancedFilters;
  activeFilters: Partial<AdvancedFilters>;
  hasActiveFilters: boolean;
  isFiltersChanged: boolean;

  // Filter Operations
  updateFilters: (updates: Partial<AdvancedFilters>) => void;
  applyFilters: (filters?: Partial<AdvancedFilters>) => void;
  clearFilters: (filterTypes?: Array<keyof AdvancedFilters>) => void;
  resetFilters: () => void;

  // Filter Validation
  validation: FilterValidationResult;
  isValid: boolean;
  validateFilters: (filters?: AdvancedFilters) => FilterValidationResult;

  // Filter Analysis
  complexity: ReturnType<typeof analyzeFilterComplexity>;

  // Filter Management
  setFilter: <K extends keyof AdvancedFilters>(filterType: K, value: AdvancedFilters[K]) => void;
  removeFilter: <K extends keyof AdvancedFilters>(
    filterType: K,
    value?: AdvancedFilters[K]
  ) => void;
  toggleFilter: <K extends keyof AdvancedFilters>(
    filterType: K,
    value: AdvancedFilters[K] extends Array<infer U> ? U : AdvancedFilters[K]
  ) => void;

  // Utility Functions
  getFilterSummary: () => string;
  hasFilter: <K extends keyof AdvancedFilters>(filterType: K) => boolean;
  getFilterValue: <K extends keyof AdvancedFilters>(filterType: K) => AdvancedFilters[K];

  // Performance & Analytics
  getFilterStats: () => {
    appliedCount: number;
    complexity: string;
    performance: 'fast' | 'moderate' | 'slow';
  };

  // Loading States
  isLoading: boolean;
  isApplying: boolean;
  error: string | null;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Advanced Filters Hook
 *
 * Provides comprehensive filter state management with validation,
 * analytics, URL synchronization, and performance optimization.
 */
export const useAdvancedFilters = (
  options: UseAdvancedFiltersOptions = {}
): UseAdvancedFiltersReturn => {
  const {
    syncWithURL = true,
    enableAnalytics = true,
    validateOnChange = true,
    // debounceDelay = 300,
    applyDefaultFilters = true,
    onFiltersChange,
    onFiltersApply,
    onValidationError,
  } = options;

  // Zustand store state
  const {
    filters,
    defaultFilters,
    isLoading,
    error,
    updateFilters: storeUpdateFilters,
    setFilters: storeSetFilters,
    clearFilters: storeClearFilters,
    resetFilters: storeResetFilters,
  } = useAdvancedFiltersStore();

  // Local state for tracking changes and validation
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilters>(filters);
  const [isApplying, setIsApplying] = useState(false);
  const [lastValidation, setLastValidation] = useState<FilterValidationResult>({
    isValid: true,
    success: true,
    data: filters,
    fieldErrors: {},
    warnings: [],
    performanceWarnings: [],
  });

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  /**
   * Active filters (non-empty values)
   */
  const activeFilters = useMemo((): Partial<AdvancedFilters> => {
    const active: Partial<AdvancedFilters> = {};

    if (filters.siteIds?.length) active.siteIds = filters.siteIds;
    if (filters.cellTypes?.length) active.cellTypes = filters.cellTypes;
    if (filters.equipmentTypes?.length) active.equipmentTypes = filters.equipmentTypes;
    if (filters.makes?.length) active.makes = filters.makes;
    if (filters.models?.length) active.models = filters.models;
    if (filters.createdAfter) active.createdAfter = filters.createdAfter;
    if (filters.createdBefore) active.createdBefore = filters.createdBefore;
    if (filters.updatedAfter) active.updatedAfter = filters.updatedAfter;
    if (filters.updatedBefore) active.updatedBefore = filters.updatedBefore;
    if (filters.ipRange?.cidr || (filters.ipRange?.startIP && filters.ipRange?.endIP)) {
      active.ipRange = filters.ipRange;
    }
    if (filters.tagFilter?.include?.length || filters.tagFilter?.exclude?.length) {
      active.tagFilter = filters.tagFilter;
    }
    if (filters.searchQuery?.trim()) active.searchQuery = filters.searchQuery;
    if (filters.searchFields?.length) active.searchFields = filters.searchFields;

    return active;
  }, [filters]);

  /**
   * Whether there are any active filters
   */
  const hasActiveFilters = useMemo(() => Object.keys(activeFilters).length > 0, [activeFilters]);

  /**
   * Whether current filters differ from applied filters
   */
  const isFiltersChanged = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(appliedFilters),
    [filters, appliedFilters]
  );

  /**
   * Filter complexity analysis
   */
  const complexity = useMemo(() => analyzeFilterComplexity(filters), [filters]);

  /**
   * Whether current filters are valid
   */
  const isValid = useMemo(() => lastValidation.isValid, [lastValidation]);

  // =============================================================================
  // FILTER OPERATIONS
  // =============================================================================

  /**
   * Updates filters with new values
   */
  const updateFilters = useCallback(
    (updates: Partial<AdvancedFilters>) => {
      const newFilters = { ...filters, ...updates };
      storeUpdateFilters(updates);

      // Validate if enabled
      if (validateOnChange) {
        const rawValidation = validateAdvancedFilters(newFilters);
        const validation: FilterValidationResult = {
          isValid: rawValidation.success,
          success: rawValidation.success,
          fieldErrors: rawValidation.fieldErrors
            ? Object.fromEntries(
                Object.entries(rawValidation.fieldErrors).map(([key, value]) => [
                  key,
                  Array.isArray(value) ? value.join(', ') : String(value),
                ])
              )
            : {},
          warnings: rawValidation.warnings || [],
          performanceWarnings: rawValidation.warnings || [],
          data: rawValidation.data,
          error: rawValidation.error,
        };
        setLastValidation(validation);

        if (!validation.success && onValidationError) {
          onValidationError(validation.fieldErrors || {});
        }
      }

      // Call custom change handler
      onFiltersChange?.(newFilters);

      // Update URL if enabled
      if (syncWithURL) {
        updateBrowserURL(newFilters);
      }
    },
    [filters, storeUpdateFilters, validateOnChange, onFiltersChange, syncWithURL, onValidationError]
  );

  /**
   * Applies filters and tracks analytics
   */
  const applyFilters = useCallback(
    async (filterUpdates?: Partial<AdvancedFilters>) => {
      setIsApplying(true);
      const startTime = Date.now();

      try {
        const filtersToApply = filterUpdates ? { ...filters, ...filterUpdates } : filters;

        // Validate before applying
        const rawValidation = validateAdvancedFilters(filtersToApply);
        const validation: FilterValidationResult = {
          isValid: rawValidation.success,
          success: rawValidation.success,
          fieldErrors: rawValidation.fieldErrors
            ? Object.fromEntries(
                Object.entries(rawValidation.fieldErrors).map(([key, value]) => [
                  key,
                  Array.isArray(value) ? value.join(', ') : String(value),
                ])
              )
            : {},
          warnings: rawValidation.warnings || [],
          performanceWarnings: rawValidation.warnings || [],
          data: rawValidation.data,
          error: rawValidation.error,
        };
        setLastValidation(validation);

        if (!validation.success) {
          onValidationError?.(validation.fieldErrors || {});
          return;
        }

        // Update applied filters state
        setAppliedFilters(filtersToApply);

        // Track analytics if enabled
        if (enableAnalytics) {
          const executionTime = Date.now() - startTime;
          trackFilterUsage({
            filters: filtersToApply,
            resultCount: 0, // Will be updated by the calling component
            executionTime,
            source: 'manual',
          });
        }

        // Call custom apply handler
        onFiltersApply?.(filtersToApply);

        // Update URL if enabled
        if (syncWithURL) {
          updateBrowserURL(filtersToApply);
        }
      } finally {
        setIsApplying(false);
      }
    },
    [filters, enableAnalytics, onFiltersApply, syncWithURL, onValidationError]
  );

  /**
   * Clears specified filters or all filters
   */
  const clearFilters = useCallback(
    (filterTypes?: Array<keyof AdvancedFilters>) => {
      if (filterTypes) {
        const updates: Partial<AdvancedFilters> = {};
        filterTypes.forEach(type => {
          switch (type) {
            case 'siteIds':
            case 'cellTypes':
            case 'equipmentTypes':
            case 'makes':
            case 'models':
            case 'searchFields':
              updates[type] = [];
              break;
            case 'createdAfter':
            case 'createdBefore':
            case 'updatedAfter':
            case 'updatedBefore':
            case 'searchQuery':
              updates[type] = undefined;
              break;
            case 'ipRange':
            case 'tagFilter':
              updates[type] = undefined;
              break;
            case 'page':
              updates[type] = 1;
              break;
            case 'pageSize':
              updates[type] = 50;
              break;
            case 'sortBy':
              updates[type] = 'name';
              break;
            case 'sortOrder':
              updates[type] = 'asc';
              break;
          }
        });
        updateFilters(updates);
      } else {
        storeClearFilters();
      }
    },
    [updateFilters, storeClearFilters]
  );

  /**
   * Resets filters to default state
   */
  const resetFilters = useCallback(() => {
    storeResetFilters();
    setAppliedFilters(defaultFilters);

    if (syncWithURL) {
      updateBrowserURL(defaultFilters);
    }
  }, [storeResetFilters, defaultFilters, syncWithURL]);

  /**
   * Validates current or provided filters
   */
  const validateFilters = useCallback(
    (filtersToValidate?: AdvancedFilters): FilterValidationResult => {
      const rawValidation = validateAdvancedFilters(filtersToValidate || filters);
      const validation: FilterValidationResult = {
        isValid: rawValidation.success,
        success: rawValidation.success,
        fieldErrors: rawValidation.fieldErrors
          ? Object.fromEntries(
              Object.entries(rawValidation.fieldErrors).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.join(', ') : String(value),
              ])
            )
          : {},
        warnings: rawValidation.warnings || [],
        performanceWarnings: rawValidation.warnings || [],
        data: rawValidation.data,
        error: rawValidation.error,
      };
      setLastValidation(validation);
      return validation;
    },
    [filters]
  );

  // =============================================================================
  // FILTER MANAGEMENT HELPERS
  // =============================================================================

  /**
   * Sets a specific filter value
   */
  const setFilter = useCallback(
    <K extends keyof AdvancedFilters>(filterType: K, value: AdvancedFilters[K]) => {
      updateFilters({ [filterType]: value });
    },
    [updateFilters]
  );

  /**
   * Removes a filter or specific value from a filter
   */
  const removeFilter = useCallback(
    <K extends keyof AdvancedFilters>(filterType: K, value?: AdvancedFilters[K]) => {
      const currentValue = filters[filterType];

      if (Array.isArray(currentValue) && value !== undefined) {
        // Remove specific value from array filter
        const newArray = currentValue.filter(item => item !== value);
        updateFilters({ [filterType]: newArray as AdvancedFilters[K] });
      } else {
        // Clear the entire filter
        clearFilters([filterType]);
      }
    },
    [filters, updateFilters, clearFilters]
  );

  /**
   * Toggles a filter value (for multi-select filters)
   */
  const toggleFilter = useCallback(
    <K extends keyof AdvancedFilters>(
      filterType: K,
      value: AdvancedFilters[K] extends Array<infer U> ? U : AdvancedFilters[K]
    ) => {
      const currentValue = filters[filterType];

      if (Array.isArray(currentValue)) {
        // Type assertion is necessary here due to complex conditional type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedValue = value as any;
        const isSelected = currentValue.includes(typedValue);
        const newArray = isSelected
          ? currentValue.filter(item => item !== value)
          : [...currentValue, typedValue];
        updateFilters({ [filterType]: newArray as AdvancedFilters[K] });
      }
    },
    [filters, updateFilters]
  );

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Gets a human-readable filter summary
   */
  const getFilterSummary = useCallback((): string => {
    const activeParts: string[] = [];

    if (filters.siteIds?.length) {
      activeParts.push(`${filters.siteIds.length} site${filters.siteIds.length > 1 ? 's' : ''}`);
    }
    if (filters.equipmentTypes?.length) {
      activeParts.push(
        `${filters.equipmentTypes.length} type${filters.equipmentTypes.length > 1 ? 's' : ''}`
      );
    }
    if (filters.makes?.length) {
      activeParts.push(`${filters.makes.length} make${filters.makes.length > 1 ? 's' : ''}`);
    }
    if (filters.tagFilter?.include?.length) {
      activeParts.push(
        `${filters.tagFilter.include.length} tag${filters.tagFilter.include.length > 1 ? 's' : ''}`
      );
    }
    if (filters.createdAfter || filters.createdBefore) {
      activeParts.push('date range');
    }
    if (filters.ipRange) {
      activeParts.push('IP range');
    }
    if (filters.searchQuery) {
      activeParts.push('text search');
    }

    if (activeParts.length === 0) {
      return 'No filters applied';
    }

    return `Filtered by ${activeParts.join(', ')}`;
  }, [filters]);

  /**
   * Checks if a specific filter is active
   */
  const hasFilter = useCallback(
    <K extends keyof AdvancedFilters>(filterType: K): boolean => {
      const value = filters[filterType];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    },
    [filters]
  );

  /**
   * Gets the value of a specific filter
   */
  const getFilterValue = useCallback(
    <K extends keyof AdvancedFilters>(filterType: K): AdvancedFilters[K] => {
      return filters[filterType];
    },
    [filters]
  );

  /**
   * Gets filter statistics
   */
  const getFilterStats = useCallback(() => {
    const appliedCount = Object.keys(activeFilters).length;
    const complexityLevel = complexity.level;

    let performance: 'fast' | 'moderate' | 'slow';
    if (complexity.score < 3) performance = 'fast';
    else if (complexity.score < 7) performance = 'moderate';
    else performance = 'slow';

    return {
      appliedCount,
      complexity: complexityLevel,
      performance,
    };
  }, [activeFilters, complexity]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Initialize filters from URL on mount
   */
  useEffect(() => {
    if (syncWithURL && applyDefaultFilters) {
      const { filters: urlFilters } = parseFiltersFromURL();
      if (urlFilters) {
        storeSetFilters(urlFilters);
        setAppliedFilters(urlFilters);
      }
    }
  }, [syncWithURL, applyDefaultFilters, storeSetFilters]);

  /**
   * Track filter effectiveness when results change
   */
  useEffect(() => {
    if (enableAnalytics && hasActiveFilters) {
      // This would typically be called with actual result data
      // For now, we'll track the filter application
      trackFilterEffectiveness({
        filters,
        originalResultCount: 1000, // Placeholder
        filteredResultCount: 100, // Placeholder
      });
    }
  }, [enableAnalytics, hasActiveFilters, filters]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Filter State
    filters,
    activeFilters,
    hasActiveFilters,
    isFiltersChanged,

    // Filter Operations
    updateFilters,
    applyFilters,
    clearFilters,
    resetFilters,

    // Filter Validation
    validation: lastValidation,
    isValid,
    validateFilters,

    // Filter Analysis
    complexity,

    // Filter Management
    setFilter,
    removeFilter,
    toggleFilter,

    // Utility Functions
    getFilterSummary,
    hasFilter,
    getFilterValue,

    // Performance & Analytics
    getFilterStats,

    // Loading States
    isLoading,
    isApplying,
    error,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Simplified version of useAdvancedFilters for basic filtering needs
 */
export const useSimpleFilters = (/* initialFilters?: Partial<AdvancedFilters> */) => {
  return useAdvancedFilters({
    syncWithURL: false,
    enableAnalytics: false,
    validateOnChange: false,
    applyDefaultFilters: false,
  });
};

/**
 * Read-only version of useAdvancedFilters for display purposes
 */
export const useReadOnlyFilters = () => {
  const { filters, activeFilters, hasActiveFilters, getFilterSummary } = useAdvancedFilters({
    syncWithURL: false,
    enableAnalytics: false,
    validateOnChange: false,
    applyDefaultFilters: false,
  });

  return {
    filters,
    activeFilters,
    hasActiveFilters,
    getFilterSummary,
  };
};

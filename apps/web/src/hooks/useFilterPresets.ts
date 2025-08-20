/**
 * Filter Presets Hook
 * Story 5.1: Advanced Filtering System
 *
 * Hook for managing filter presets with CRUD operations,
 * sharing, analytics, and local caching.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  clearDefaultPreset,
  createFilterPreset,
  deleteFilterPreset,
  getDefaultPreset,
  getFilterPreset,
  getFilterPresets,
  getPresetRecommendations,
  getSharedFilterPreset,
  getTrendingPresets,
  handlePresetError,
  setDefaultPreset,
  shareFilterPreset,
  updateFilterPreset,
} from '../services/filter-presets.service';
import { trackFilterBehavior } from '../utils/filter-analytics.utils';
import type {
  AdvancedFilters,
  CreateFilterPresetRequest,
  FilterPreset,
  UpdateFilterPresetRequest,
  // FilterPresetListResponse
} from '../types/advanced-filters';

// =============================================================================
// HOOK OPTIONS INTERFACE
// =============================================================================

/**
 * Options for configuring the useFilterPresets hook
 */
interface UseFilterPresetsOptions {
  /**
   * Whether to enable analytics tracking
   * @default true
   */
  enableAnalytics?: boolean;

  /**
   * Whether to cache presets locally
   * @default true
   */
  enableCaching?: boolean;

  /**
   * Auto-refresh interval for preset list in milliseconds
   * @default 30000 (30 seconds)
   */
  refreshInterval?: number;

  /**
   * Whether to automatically load default preset on mount
   * @default true
   */
  loadDefaultPreset?: boolean;

  /**
   * Custom preset change handler
   */
  onPresetChange?: (preset: FilterPreset | null) => void;

  /**
   * Custom preset apply handler
   */
  onPresetApply?: (preset: FilterPreset, filters: AdvancedFilters) => void;

  /**
   * Custom error handler
   */
  onError?: (error: string) => void;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

const QUERY_KEYS = {
  presets: ['filter-presets'],
  presetsList: (params?: Record<string, unknown>) => ['filter-presets', 'list', params],
  preset: (id: string) => ['filter-presets', 'detail', id],
  defaultPreset: ['filter-presets', 'default'],
  recommendations: (filters?: AdvancedFilters) => ['filter-presets', 'recommendations', filters],
  trending: (timeRange?: string) => ['filter-presets', 'trending', timeRange],
  shared: (token: string) => ['filter-presets', 'shared', token],
} as const;

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useFilterPresets hook
 */
interface UseFilterPresetsReturn {
  // Preset List Management
  presets: FilterPreset[];
  presetsCount: number;
  isLoadingPresets: boolean;
  presetsError: string | null;
  refreshPresets: () => void;

  // Current Preset State
  currentPreset: FilterPreset | null;
  isPresetActive: boolean;
  activePresetId: string | null;

  // Default Preset Management
  defaultPreset: FilterPreset | null;
  isLoadingDefault: boolean;
  defaultError: string | null;

  // Preset CRUD Operations
  createPreset: (request: CreateFilterPresetRequest) => Promise<FilterPreset>;
  updatePreset: (id: string, request: UpdateFilterPresetRequest) => Promise<FilterPreset>;
  deletePreset: (id: string) => Promise<void>;
  duplicatePreset: (id: string, newName?: string) => Promise<FilterPreset>;

  // Preset Application
  applyPreset: (id: string) => Promise<AdvancedFilters>;
  loadPreset: (id: string) => Promise<FilterPreset>;

  // Default Preset Operations
  setAsDefault: (id: string) => Promise<void>;
  clearDefault: () => Promise<void>;

  // Preset Sharing
  sharePreset: (
    id: string,
    options?: Record<string, unknown>
  ) => Promise<{ shareToken: string; shareUrl: string }>;
  loadSharedPreset: (token: string) => Promise<FilterPreset>;

  // Preset Discovery
  recommendations: FilterPreset[];
  trendingPresets: FilterPreset[];
  isLoadingRecommendations: boolean;
  isLoadingTrending: boolean;

  // Preset Utilities
  saveCurrentFilters: (name: string, description?: string) => Promise<FilterPreset>;
  findPresetByFilters: (filters: AdvancedFilters) => FilterPreset | null;
  getPresetSummary: (preset: FilterPreset) => string;

  // Loading States
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isApplying: boolean;
  isSharing: boolean;

  // Error States
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;
  applyError: string | null;
  shareError: string | null;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Filter Presets Hook
 *
 * Provides comprehensive preset management with CRUD operations,
 * sharing, recommendations, and analytics.
 */
export const useFilterPresets = (options: UseFilterPresetsOptions = {}): UseFilterPresetsReturn => {
  const {
    enableAnalytics = true,
    enableCaching = true,
    refreshInterval = 30000,
    loadDefaultPreset = true,
    onPresetChange,
    onPresetApply,
    onError,
  } = options;

  const queryClient = useQueryClient();

  // Local state
  const [currentPreset, setCurrentPreset] = useState<FilterPreset | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // =============================================================================
  // QUERIES
  // =============================================================================

  /**
   * Query for preset list
   */
  const {
    data: presetsResponse,
    isLoading: isLoadingPresets,
    error: presetsQueryError,
    refetch: refreshPresets,
  } = useQuery({
    queryKey: QUERY_KEYS.presetsList(),
    queryFn: () =>
      getFilterPresets({
        sortBy: 'last_used_at',
        sortOrder: 'desc',
      }),
    refetchInterval: refreshInterval,
    staleTime: enableCaching ? 5 * 60 * 1000 : 0, // 5 minutes if caching enabled
  });

  /**
   * Query for default preset
   */
  const {
    data: defaultPreset,
    isLoading: isLoadingDefault,
    error: defaultQueryError,
  } = useQuery({
    queryKey: QUERY_KEYS.defaultPreset,
    queryFn: getDefaultPreset,
    enabled: loadDefaultPreset,
    staleTime: enableCaching ? 10 * 60 * 1000 : 0, // 10 minutes if caching enabled
  });

  /**
   * Query for preset recommendations
   */
  const { data: recommendationsResponse, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: QUERY_KEYS.recommendations(),
    queryFn: () => getPresetRecommendations(),
    staleTime: enableCaching ? 15 * 60 * 1000 : 0, // 15 minutes if caching enabled
  });

  /**
   * Query for trending presets
   */
  const { data: trendingResponse, isLoading: isLoadingTrending } = useQuery({
    queryKey: QUERY_KEYS.trending('week'),
    queryFn: () => getTrendingPresets('week'),
    staleTime: enableCaching ? 30 * 60 * 1000 : 0, // 30 minutes if caching enabled
  });

  // =============================================================================
  // MUTATIONS
  // =============================================================================

  /**
   * Create preset mutation
   */
  const createMutation = useMutation({
    mutationFn: createFilterPreset,
    onSuccess: preset => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets });
      setCurrentPreset(preset);
      setActivePresetId(preset.id);

      if (enableAnalytics) {
        trackFilterBehavior({
          action: 'preset_save',
          filters: preset.filterConfig,
        });
      }

      onPresetChange?.(preset);
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  /**
   * Update preset mutation
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateFilterPresetRequest }) =>
      updateFilterPreset(id, request),
    onSuccess: preset => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets });
      queryClient.setQueryData(QUERY_KEYS.preset(preset.id), preset);

      if (activePresetId === preset.id) {
        setCurrentPreset(preset);
        onPresetChange?.(preset);
      }
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  /**
   * Delete preset mutation
   */
  const deleteMutation = useMutation({
    mutationFn: deleteFilterPreset,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.presets });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.preset(deletedId) });

      if (activePresetId === deletedId) {
        setCurrentPreset(null);
        setActivePresetId(null);
        onPresetChange?.(null);
      }
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  /**
   * Set default preset mutation
   */
  const setDefaultMutation = useMutation({
    mutationFn: setDefaultPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.defaultPreset });
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  /**
   * Clear default preset mutation
   */
  const clearDefaultMutation = useMutation({
    mutationFn: clearDefaultPreset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.defaultPreset });
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  /**
   * Share preset mutation
   */
  const shareMutation = useMutation({
    mutationFn: ({ id, options }: { id: string; options?: Record<string, unknown> }) =>
      shareFilterPreset(id, options),
    onSuccess: () => {
      if (enableAnalytics) {
        trackFilterBehavior({
          action: 'share',
        });
      }
    },
    onError: error => {
      const errorMessage = handlePresetError(error);
      onError?.(errorMessage);
    },
  });

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const presets = useMemo(() => presetsResponse?.data || [], [presetsResponse]);

  const presetsCount = useMemo(() => presetsResponse?.pagination?.total || 0, [presetsResponse]);

  const recommendations = useMemo(
    () => recommendationsResponse?.map(r => r.preset) || [],
    [recommendationsResponse]
  );

  const trendingPresets = useMemo(
    () => trendingResponse?.map(t => t.preset) || [],
    [trendingResponse]
  );

  const isPresetActive = useMemo(() => activePresetId !== null, [activePresetId]);

  // Error handling
  const presetsError = useMemo(
    () => (presetsQueryError ? handlePresetError(presetsQueryError) : null),
    [presetsQueryError]
  );

  const defaultError = useMemo(
    () => (defaultQueryError ? handlePresetError(defaultQueryError) : null),
    [defaultQueryError]
  );

  // =============================================================================
  // OPERATIONS
  // =============================================================================

  /**
   * Creates a new filter preset
   */
  const createPreset = useCallback(
    async (request: CreateFilterPresetRequest): Promise<FilterPreset> => {
      return createMutation.mutateAsync(request);
    },
    [createMutation]
  );

  /**
   * Updates an existing filter preset
   */
  const updatePreset = useCallback(
    async (id: string, request: UpdateFilterPresetRequest): Promise<FilterPreset> => {
      return updateMutation.mutateAsync({ id, request });
    },
    [updateMutation]
  );

  /**
   * Deletes a filter preset
   */
  const deletePreset = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  /**
   * Duplicates an existing preset
   */
  const duplicatePreset = useCallback(
    async (id: string, newName?: string): Promise<FilterPreset> => {
      const originalPreset = await getFilterPreset(id);
      const duplicatedRequest: CreateFilterPresetRequest = {
        name: newName || `${originalPreset.name} (Copy)`,
        description: originalPreset.description,
        filterConfig: originalPreset.filterConfig,
        category: originalPreset.category,
        tags: originalPreset.tags,
        isPublic: false, // Duplicated presets default to private
      };

      return createPreset(duplicatedRequest);
    },
    [createPreset]
  );

  /**
   * Applies a preset and returns the filter configuration
   */
  const applyPreset = useCallback(
    async (id: string): Promise<AdvancedFilters> => {
      try {
        const preset = await getFilterPreset(id);
        setCurrentPreset(preset);
        setActivePresetId(id);

        if (enableAnalytics) {
          trackFilterBehavior({
            action: 'preset_load',
            filters: preset.filterConfig,
          });
        }

        onPresetApply?.(preset, preset.filterConfig);
        onPresetChange?.(preset);

        return preset.filterConfig;
      } catch (error) {
        const errorMessage = handlePresetError(error);
        onError?.(errorMessage);
        throw error;
      }
    },
    [enableAnalytics, onPresetApply, onPresetChange, onError]
  );

  /**
   * Loads a preset without applying it
   */
  const loadPreset = useCallback(async (id: string): Promise<FilterPreset> => {
    return getFilterPreset(id);
  }, []);

  /**
   * Sets a preset as the default
   */
  const setAsDefault = useCallback(
    async (id: string): Promise<void> => {
      return setDefaultMutation.mutateAsync(id);
    },
    [setDefaultMutation]
  );

  /**
   * Clears the default preset
   */
  const clearDefault = useCallback(async (): Promise<void> => {
    return clearDefaultMutation.mutateAsync();
  }, [clearDefaultMutation]);

  /**
   * Shares a preset
   */
  const sharePreset = useCallback(
    async (
      id: string,
      options?: Record<string, unknown>
    ): Promise<{ shareToken: string; shareUrl: string }> => {
      return shareMutation.mutateAsync({ id, options });
    },
    [shareMutation]
  );

  /**
   * Loads a shared preset
   */
  const loadSharedPreset = useCallback(async (token: string): Promise<FilterPreset> => {
    const response = await getSharedFilterPreset(token);
    return response.preset;
  }, []);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Saves current filters as a new preset
   */
  const saveCurrentFilters = useCallback(
    async (
      name: string,
      description?: string,
      filters?: AdvancedFilters
    ): Promise<FilterPreset> => {
      if (!filters) {
        throw new Error('No filters provided to save');
      }

      const request: CreateFilterPresetRequest = {
        name,
        description,
        filterConfig: filters,
        isPublic: false,
      };

      return createPreset(request);
    },
    [createPreset]
  );

  /**
   * Finds a preset that matches the given filters
   */
  const findPresetByFilters = useCallback(
    (filters: AdvancedFilters): FilterPreset | null => {
      return (
        presets.find(
          (preset: FilterPreset) => JSON.stringify(preset.filterConfig) === JSON.stringify(filters)
        ) || null
      );
    },
    [presets]
  );

  /**
   * Gets a human-readable summary of a preset
   */
  const getPresetSummary = useCallback((preset: FilterPreset): string => {
    const filters = preset.filterConfig;
    const parts: string[] = [];

    if (filters.siteIds?.length) {
      parts.push(`${filters.siteIds.length} site${filters.siteIds.length > 1 ? 's' : ''}`);
    }
    if (filters.equipmentTypes?.length) {
      parts.push(
        `${filters.equipmentTypes.length} type${filters.equipmentTypes.length > 1 ? 's' : ''}`
      );
    }
    if (filters.makes?.length) {
      parts.push(`${filters.makes.length} make${filters.makes.length > 1 ? 's' : ''}`);
    }
    if (filters.tagFilter?.include?.length) {
      parts.push(
        `${filters.tagFilter.include.length} tag${filters.tagFilter.include.length > 1 ? 's' : ''}`
      );
    }

    return parts.length > 0 ? `Filters: ${parts.join(', ')}` : 'No active filters';
  }, []);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Auto-apply default preset on mount
   */
  useEffect(() => {
    if (loadDefaultPreset && defaultPreset && !currentPreset) {
      setCurrentPreset(defaultPreset);
      setActivePresetId(defaultPreset.id);
      onPresetChange?.(defaultPreset);
    }
  }, [loadDefaultPreset, defaultPreset, currentPreset, onPresetChange]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Preset List Management
    presets,
    presetsCount,
    isLoadingPresets,
    presetsError,
    refreshPresets,

    // Current Preset State
    currentPreset,
    isPresetActive,
    activePresetId,

    // Default Preset Management
    defaultPreset: defaultPreset || null,
    isLoadingDefault,
    defaultError,

    // Preset CRUD Operations
    createPreset,
    updatePreset,
    deletePreset,
    duplicatePreset,

    // Preset Application
    applyPreset,
    loadPreset,

    // Default Preset Operations
    setAsDefault,
    clearDefault,

    // Preset Sharing
    sharePreset,
    loadSharedPreset,

    // Preset Discovery
    recommendations,
    trendingPresets,
    isLoadingRecommendations,
    isLoadingTrending,

    // Preset Utilities
    saveCurrentFilters,
    findPresetByFilters,
    getPresetSummary,

    // Loading States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isApplying: false, // This would be managed by the component using the hook
    isSharing: shareMutation.isPending,

    // Error States
    createError: createMutation.error ? handlePresetError(createMutation.error) : null,
    updateError: updateMutation.error ? handlePresetError(updateMutation.error) : null,
    deleteError: deleteMutation.error ? handlePresetError(deleteMutation.error) : null,
    applyError: null, // This would be managed by the component using the hook
    shareError: shareMutation.error ? handlePresetError(shareMutation.error) : null,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Simplified preset hook for basic operations
 */
export const useSimplePresets = () => {
  return useFilterPresets({
    enableAnalytics: false,
    enableCaching: false,
    loadDefaultPreset: false,
  });
};

/**
 * Read-only preset hook for display purposes
 */
export const useReadOnlyPresets = () => {
  const { presets, defaultPreset, isLoadingPresets, getPresetSummary } = useFilterPresets({
    enableAnalytics: false,
    loadDefaultPreset: true,
  });

  return {
    presets,
    defaultPreset,
    isLoadingPresets,
    getPresetSummary,
  };
};

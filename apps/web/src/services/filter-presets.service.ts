/**
 * Filter Preset Management Service
 * Story 5.1: Advanced Filtering System
 *
 * Service for managing filter presets with API integration,
 * sharing, versioning, and analytics.
 */

import { apiClient } from './api.client';
import type {
  AdvancedFilters,
  CreateFilterPresetRequest,
  FilterPreset,
  UpdateFilterPresetRequest,
  // FilterPresetListResponse,
  // SharedFilterResponse
} from '../types/advanced-filters';

// =============================================================================
// PRESET CRUD OPERATIONS
// =============================================================================

/**
 * Gets user's filter presets with optional filtering and pagination
 */
export const getFilterPresets = async (options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'created_at' | 'usage_count' | 'last_used_at';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: FilterPreset[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  const params = new URLSearchParams();

  if (options?.page) params.append('page', options.page.toString());
  if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options?.search) params.append('search', options.search);
  if (options?.category) params.append('category', options.category);
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

  const response = await apiClient.get(`/api/filters/presets?${params.toString()}`);
  return response.data;
};

/**
 * Creates a new filter preset
 */
export const createFilterPreset = async (
  request: CreateFilterPresetRequest
): Promise<FilterPreset> => {
  const response = await apiClient.post('/api/filters/presets', request);
  return response.data;
};

/**
 * Updates an existing filter preset
 */
export const updateFilterPreset = async (
  presetId: string,
  request: UpdateFilterPresetRequest
): Promise<FilterPreset> => {
  const response = await apiClient.put(`/api/filters/presets/${presetId}`, request);
  return response.data;
};

/**
 * Deletes a filter preset
 */
export const deleteFilterPreset = async (presetId: string): Promise<void> => {
  await apiClient.delete(`/api/filters/presets/${presetId}`);
};

/**
 * Gets a specific filter preset by ID
 */
export const getFilterPreset = async (presetId: string): Promise<FilterPreset> => {
  const response = await apiClient.get(`/api/filters/presets/${presetId}`);
  return response.data;
};

// =============================================================================
// PRESET SHARING
// =============================================================================

/**
 * Shares a filter preset with team members
 */
export const shareFilterPreset = async (
  presetId: string,
  options?: {
    expiresAt?: Date;
    permissions?: 'view' | 'edit';
    users?: string[];
    groups?: string[];
  }
): Promise<{ shareToken: string; shareUrl: string }> => {
  const response = await apiClient.post(`/api/filters/presets/${presetId}/share`, options);
  return response.data;
};

/**
 * Gets a shared filter preset by token
 */
export const getSharedFilterPreset = async (
  shareToken: string
): Promise<{
  preset: FilterPreset;
  shareInfo: { createdAt: string; expiresAt?: string; accessCount: number };
}> => {
  const response = await apiClient.get(`/api/filters/shared/${shareToken}`);
  return response.data;
};

/**
 * Revokes sharing for a filter preset
 */
export const revokeFilterPresetShare = async (presetId: string): Promise<void> => {
  await apiClient.delete(`/api/filters/presets/${presetId}/share`);
};

/**
 * Gets sharing status and statistics for a preset
 */
export const getPresetSharingInfo = async (
  presetId: string
): Promise<{
  isShared: boolean;
  shareToken?: string;
  shareUrl?: string;
  sharedAt?: Date;
  accessCount: number;
  lastAccessed?: Date;
  permissions: string[];
}> => {
  const response = await apiClient.get(`/api/filters/presets/${presetId}/sharing-info`);
  return response.data;
};

// =============================================================================
// PRESET VERSIONING
// =============================================================================

/**
 * Gets version history for a filter preset
 */
export const getPresetVersions = async (
  presetId: string
): Promise<{
  versions: Array<{
    version: number;
    filterConfig: AdvancedFilters;
    createdAt: Date;
    createdBy: string;
    changeDescription?: string;
  }>;
  currentVersion: number;
}> => {
  const response = await apiClient.get(`/api/filters/presets/${presetId}/versions`);
  return response.data;
};

/**
 * Restores a preset to a specific version
 */
export const restorePresetVersion = async (
  presetId: string,
  version: number,
  changeDescription?: string
): Promise<FilterPreset> => {
  const response = await apiClient.post(`/api/filters/presets/${presetId}/restore`, {
    version,
    changeDescription,
  });
  return response.data;
};

/**
 * Compares two preset versions
 */
export const comparePresetVersions = async (
  presetId: string,
  fromVersion: number,
  toVersion: number
): Promise<{
  differences: Array<{
    path: string;
    operation: 'add' | 'remove' | 'change';
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  summary: {
    filtersAdded: number;
    filtersRemoved: number;
    filtersChanged: number;
  };
}> => {
  const response = await apiClient.get(
    `/api/filters/presets/${presetId}/compare/${fromVersion}/${toVersion}`
  );
  return response.data;
};

// =============================================================================
// DEFAULT PRESET ASSIGNMENT
// =============================================================================

/**
 * Sets a preset as default for the current user
 */
export const setDefaultPreset = async (presetId: string): Promise<void> => {
  await apiClient.post(`/api/filters/presets/${presetId}/set-default`);
};

/**
 * Gets the default preset for the current user
 */
export const getDefaultPreset = async (): Promise<FilterPreset | null> => {
  try {
    const response = await apiClient.get('/api/filters/presets/default');
    return response.data;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null; // No default preset set
    }
    throw error;
  }
};

/**
 * Clears the default preset for the current user
 */
export const clearDefaultPreset = async (): Promise<void> => {
  await apiClient.delete('/api/filters/presets/default');
};

/**
 * Gets role-based default presets
 */
export const getRoleDefaultPresets = async (): Promise<
  {
    role: string;
    presets: FilterPreset[];
  }[]
> => {
  const response = await apiClient.get('/api/filters/presets/role-defaults');
  return response.data;
};

// =============================================================================
// PRESET ANALYTICS
// =============================================================================

/**
 * Gets usage statistics for a filter preset
 */
export const getPresetAnalytics = async (
  presetId: string,
  timeRange?: {
    startDate: Date;
    endDate: Date;
  }
): Promise<{
  totalUsage: number;
  uniqueUsers: number;
  averageUsesPerUser: number;
  usageByDay: Array<{ date: Date; count: number }>;
  topUsers: Array<{ userId: string; userName: string; usageCount: number }>;
  performanceMetrics: {
    averageExecutionTime: number;
    averageResultCount: number;
  };
}> => {
  const params = new URLSearchParams();
  if (timeRange?.startDate) params.append('startDate', timeRange.startDate.toISOString());
  if (timeRange?.endDate) params.append('endDate', timeRange.endDate.toISOString());

  const response = await apiClient.get(
    `/api/filters/presets/${presetId}/analytics?${params.toString()}`
  );
  return response.data;
};

/**
 * Gets overall preset usage statistics for the user
 */
export const getUserPresetAnalytics = async (): Promise<{
  totalPresets: number;
  totalUsage: number;
  mostUsedPreset?: {
    preset: FilterPreset;
    usageCount: number;
  };
  recentlyUsed: FilterPreset[];
  creationTrend: Array<{ month: string; count: number }>;
}> => {
  const response = await apiClient.get('/api/filters/presets/user-analytics');
  return response.data;
};

// =============================================================================
// PRESET IMPORT/EXPORT
// =============================================================================

/**
 * Exports filter presets to various formats
 */
export const exportFilterPresets = async (
  presetIds: string[],
  format: 'json' | 'csv' | 'xlsx' = 'json',
  options?: {
    includeAnalytics?: boolean;
    includeVersionHistory?: boolean;
  }
): Promise<Blob> => {
  const response = await apiClient.post(
    '/api/filters/presets/export',
    {
      presetIds,
      format,
      ...options,
    },
    {
      responseType: 'blob',
    }
  );

  return response.data;
};

/**
 * Imports filter presets from a file
 */
export const importFilterPresets = async (
  file: File,
  options?: {
    overwriteExisting?: boolean;
    categoryTag?: string;
  }
): Promise<{
  imported: number;
  skipped: number;
  errors: Array<{ preset: string; error: string }>;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.overwriteExisting !== undefined) {
    formData.append('overwriteExisting', options.overwriteExisting.toString());
  }
  if (options?.categoryTag) {
    formData.append('categoryTag', options.categoryTag);
  }

  const response = await apiClient.post('/api/filters/presets/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// =============================================================================
// PRESET CATEGORIZATION & TAGGING
// =============================================================================

/**
 * Gets available preset categories
 */
export const getPresetCategories = async (): Promise<
  Array<{
    name: string;
    count: number;
    description?: string;
  }>
> => {
  const response = await apiClient.get('/api/filters/presets/categories');
  return response.data;
};

/**
 * Adds tags to a filter preset
 */
export const addPresetTags = async (presetId: string, tags: string[]): Promise<FilterPreset> => {
  const response = await apiClient.post(`/api/filters/presets/${presetId}/tags`, { tags });
  return response.data;
};

/**
 * Removes tags from a filter preset
 */
export const removePresetTags = async (presetId: string, tags: string[]): Promise<FilterPreset> => {
  const response = await apiClient.delete(`/api/filters/presets/${presetId}/tags`, {
    data: { tags },
  });
  return response.data;
};

/**
 * Gets presets by tags
 */
export const getPresetsByTags = async (
  tags: string[],
  logic: 'AND' | 'OR' = 'AND'
): Promise<FilterPreset[]> => {
  const params = new URLSearchParams();
  tags.forEach(tag => params.append('tags', tag));
  params.append('logic', logic);

  const response = await apiClient.get(`/api/filters/presets/by-tags?${params.toString()}`);
  return response.data;
};

// =============================================================================
// PRESET RECOMMENDATIONS
// =============================================================================

/**
 * Gets recommended presets based on user behavior and current filters
 */
export const getPresetRecommendations = async (
  currentFilters?: AdvancedFilters,
  limit = 5
): Promise<
  Array<{
    preset: FilterPreset;
    reason: string;
    similarity: number;
    confidence: number;
  }>
> => {
  const response = await apiClient.post('/api/filters/presets/recommendations', {
    currentFilters,
    limit,
  });
  return response.data;
};

/**
 * Gets trending presets (most used recently)
 */
export const getTrendingPresets = async (
  timeRange: 'day' | 'week' | 'month' = 'week',
  limit = 10
): Promise<
  Array<{
    preset: FilterPreset;
    usageCount: number;
    growthRate: number;
  }>
> => {
  const params = new URLSearchParams();
  params.append('timeRange', timeRange);
  params.append('limit', limit.toString());

  const response = await apiClient.get(`/api/filters/presets/trending?${params.toString()}`);
  return response.data;
};

// =============================================================================
// PRESET BACKUP & RESTORE
// =============================================================================

/**
 * Creates a backup of all user presets
 */
export const createPresetBackup = async (): Promise<{
  backupId: string;
  createdAt: Date;
  presetCount: number;
  downloadUrl: string;
}> => {
  const response = await apiClient.post('/api/filters/presets/backup');
  return response.data;
};

/**
 * Gets available preset backups
 */
export const getPresetBackups = async (): Promise<
  Array<{
    backupId: string;
    createdAt: Date;
    presetCount: number;
    size: number;
    downloadUrl: string;
  }>
> => {
  const response = await apiClient.get('/api/filters/presets/backups');
  return response.data;
};

/**
 * Restores presets from a backup
 */
export const restoreFromBackup = async (
  backupId: string,
  options?: {
    overwriteExisting?: boolean;
    selectiveRestore?: string[]; // preset IDs to restore
  }
): Promise<{
  restored: number;
  skipped: number;
  errors: Array<{ preset: string; error: string }>;
}> => {
  const response = await apiClient.post(`/api/filters/presets/restore/${backupId}`, options);
  return response.data;
};

/**
 * Deletes a preset backup
 */
export const deletePresetBackup = async (backupId: string): Promise<void> => {
  await apiClient.delete(`/api/filters/presets/backups/${backupId}`);
};

// =============================================================================
// VALIDATION & SANITIZATION
// =============================================================================

/**
 * Validates a filter preset configuration
 */
export const validatePreset = async (preset: {
  name: string;
  filterConfig: AdvancedFilters;
}): Promise<{
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}> => {
  const response = await apiClient.post('/api/filters/presets/validate', preset);
  return response.data;
};

/**
 * Sanitizes a filter preset configuration
 */
export const sanitizePreset = async (preset: {
  name: string;
  filterConfig: AdvancedFilters;
}): Promise<{
  name: string;
  filterConfig: AdvancedFilters;
  changes: Array<{ field: string; action: string; reason: string }>;
}> => {
  const response = await apiClient.post('/api/filters/presets/sanitize', preset);
  return response.data;
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Handles API errors with appropriate user-friendly messages
 */
export const handlePresetError = (error: unknown): string => {
  const axiosError = error as {
    response?: {
      status?: number;
      data?: {
        details?: Array<{ message: string }>;
      };
    };
  };

  if (axiosError?.response?.status === 404) {
    return 'Filter preset not found. It may have been deleted or you may not have access to it.';
  }

  if (axiosError?.response?.status === 403) {
    return 'You do not have permission to perform this action on the filter preset.';
  }

  if (axiosError?.response?.status === 409) {
    return 'A filter preset with this name already exists. Please choose a different name.';
  }

  if (axiosError?.response?.status === 422) {
    const details = axiosError?.response?.data?.details || [];
    if (details.length > 0) {
      return `Validation error: ${details.map((d: { message: string }) => d.message).join(', ')}`;
    }
    return 'The filter preset configuration is invalid.';
  }

  if (axiosError?.response?.status && axiosError.response.status >= 500) {
    return 'Server error occurred while processing the filter preset. Please try again later.';
  }

  return (
    (error instanceof Error ? error.message : String(error)) ||
    'An unexpected error occurred with the filter preset operation.'
  );
};

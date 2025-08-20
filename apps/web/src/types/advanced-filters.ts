/**
 * Advanced Filter System TypeScript interfaces
 * Story 5.1: Advanced Filtering System
 *
 * Comprehensive type definitions for the advanced filtering system including
 * multi-criteria filters, presets, URL synchronization, and performance tracking.
 */

import type { EquipmentType } from './equipment';

// =============================================================================
// CORE FILTER TYPES
// =============================================================================

/**
 * Main interface for all advanced filter criteria
 * Supports multi-criteria filtering with performance optimization
 */
export interface AdvancedFilters {
  // Multi-select filters
  /** Array of site IDs to filter by */
  siteIds?: string[];
  /** Array of cell types to filter by */
  cellTypes?: string[];
  /** Array of equipment types to filter by */
  equipmentTypes?: EquipmentType[];
  /** Array of PLC makes to filter by */
  makes?: string[];
  /** Array of PLC models to filter by (dependent on makes selection) */
  models?: string[];

  // Date range filters
  /** Filter equipment created after this date */
  createdAfter?: Date;
  /** Filter equipment created before this date */
  createdBefore?: Date;
  /** Filter equipment updated after this date */
  updatedAfter?: Date;
  /** Filter equipment updated before this date */
  updatedBefore?: Date;

  // IP address filtering
  /** IP address range filtering configuration */
  ipRange?: IPRangeFilter;

  // Tag filtering with logic operations
  /** Tag filtering configuration with AND/OR logic */
  tagFilter?: TagFilter;

  // Text search (inherited from existing system)
  /** Global text search query */
  searchQuery?: string;
  /** Fields to search within (if not specified, searches all) */
  searchFields?: string[];

  // Pagination and sorting
  /** Current page number (1-based) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * IP address range filtering options
 * Supports CIDR notation and IP range specification
 */
export interface IPRangeFilter {
  /** CIDR notation (e.g., "192.168.1.0/24") */
  cidr?: string;
  /** Start IP address for range filtering */
  startIP?: string;
  /** End IP address for range filtering */
  endIP?: string;
}

/**
 * Tag filtering with logical operations
 * Supports include/exclude lists with AND/OR logic
 */
export interface TagFilter {
  /** Tags that must be present */
  include?: string[];
  /** Tags that must not be present */
  exclude?: string[];
  /** Logic operation for include tags */
  logic?: 'AND' | 'OR';
}

// =============================================================================
// FILTER PRESET MANAGEMENT
// =============================================================================

/**
 * Saved filter combination that can be reused
 * Supports sharing and collaborative features
 */
export interface FilterPreset {
  /** Unique identifier for the preset */
  id: string;
  /** User-defined name for the preset */
  name: string;
  /** Optional description of what this preset filters */
  description?: string;
  /** The filter configuration */
  filterConfig: AdvancedFilters;
  /** Whether this is the user's default filter */
  isDefault: boolean;
  /** Whether this preset can be shared with others */
  isShared: boolean;
  /** Whether this preset is public */
  isPublic?: boolean;
  /** Category for grouping presets */
  category?: string;
  /** Tags for organizing presets */
  tags?: string[];
  /** Token for sharing preset via URL */
  sharedToken?: string;
  /** Number of times this preset has been used */
  usageCount: number;
  /** When this preset was last used */
  lastUsedAt?: Date;
  /** When this preset was created */
  createdAt: Date;
  /** When this preset was last modified */
  updatedAt: Date;
  /** ID of the user who created this preset */
  createdBy: string;
}

/**
 * Request interface for creating a new filter preset
 */
export interface CreateFilterPresetRequest {
  /** Name for the new preset */
  name: string;
  /** Optional description */
  description?: string;
  /** Filter configuration to save */
  filterConfig: AdvancedFilters;
  /** Whether to set as default preset */
  isDefault?: boolean;
  /** Whether to make the preset shareable */
  isShared?: boolean;
  /** Whether this preset is public */
  isPublic?: boolean;
  /** Category for grouping presets */
  category?: string;
  /** Tags for organizing presets */
  tags?: string[];
}

/**
 * Request interface for updating an existing filter preset
 */
export interface UpdateFilterPresetRequest extends CreateFilterPresetRequest {
  /** Timestamp for optimistic locking */
  updatedAt: string;
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * UI state for the filter panel and related components
 */
export interface FilterState {
  /** Whether the filter panel is open */
  panelOpen: boolean;
  /** Which filter sections are expanded */
  expandedSections: string[];
  /** Currently applied filters */
  filters: AdvancedFilters;
  /** Filters pending application (for debouncing) */
  pendingFilters: Partial<AdvancedFilters>;
  /** Available filter presets */
  presets: FilterPreset[];
  /** Currently selected preset ID */
  currentPresetId: string | null;
  /** Whether filters are currently being applied */
  isApplyingFilters: boolean;
  /** Whether presets are being loaded */
  isLoadingPresets: boolean;
  /** Error message if filter operation failed */
  error: string | null;
}

/**
 * Validation state for filter inputs
 */
export interface FilterValidationResult {
  /** Whether the current filter combination is valid */
  isValid: boolean;
  /** Success status (same as isValid for compatibility) */
  success?: boolean;
  /** Field-specific validation errors */
  fieldErrors: Record<string, string>;
  /** General validation warnings */
  warnings: string[];
  /** Performance warnings for complex filters */
  performanceWarnings: string[];
  /** Validated data (optional) */
  data?: AdvancedFilters;
  /** Error information (optional) */
  error?: Error | string | Record<string, unknown>;
}

export interface FilterValidation {
  /** Whether the current filter combination is valid */
  isValid: boolean;
  /** Field-specific validation errors */
  fieldErrors: Record<string, string>;
  /** General validation warnings */
  warnings: string[];
  /** Performance warnings for complex filters */
  performanceWarnings: string[];
}

// =============================================================================
// URL SYNCHRONIZATION
// =============================================================================

/**
 * Interface for shareable filter links
 * Supports URL serialization and sharing
 */
export interface ShareableFilterLink {
  /** Base64 encoded filter configuration */
  filterData: string;
  /** Optional preset ID if based on a preset */
  presetId?: string;
  /** URL-friendly token for sharing */
  shareToken?: string;
  /** Expiration date for the shared link */
  expiresAt?: Date;
}

/**
 * URL parameter mapping for filter serialization
 */
export interface FilterURLParams {
  /** Compressed filter parameters */
  f?: string;
  /** Preset ID if using a saved preset */
  p?: string;
  /** Page number */
  page?: string;
  /** Items per page */
  size?: string;
  /** Sort field */
  sort?: string;
  /** Sort direction */
  dir?: string;
}

// =============================================================================
// PERFORMANCE AND ANALYTICS
// =============================================================================

/**
 * Metadata about filter operations for analytics
 */
export interface FilterMetadata {
  /** Number of filters currently applied */
  appliedFilterCount: number;
  /** Estimated result set size */
  estimatedResults?: number;
  /** Query execution time in milliseconds */
  executionTimeMs?: number;
  /** Whether the query result was cached */
  cacheHit?: boolean;
  /** Database query complexity score */
  complexityScore?: number;
  /** Suggested optimizations for better performance */
  optimizationSuggestions?: string[];
}

/**
 * Performance metrics for filter operations
 */
export interface FilterPerformanceMetrics {
  /** Average filter application time */
  averageApplyTimeMs: number;
  /** Total number of filter operations */
  totalOperations: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
  /** Most frequently used filter combinations */
  popularFilters: FilterUsageStats[];
  /** Performance degradation warnings */
  performanceAlerts: string[];
}

/**
 * Usage statistics for filter combinations
 */
export interface FilterUsageStats {
  /** Hash of the filter combination */
  filterHash: string;
  /** Human-readable description of filters */
  description: string;
  /** Number of times this combination was used */
  usageCount: number;
  /** Average execution time for this combination */
  averageTimeMs: number;
  /** Last time this combination was used */
  lastUsedAt: Date;
}

/**
 * History entry for filter operations
 */
export interface FilterHistoryEntry {
  /** Unique identifier for this history entry */
  id: string;
  /** Filters that were applied */
  filters: AdvancedFilters;
  /** When the filters were applied */
  appliedAt: Date;
  /** Number of results returned */
  resultCount: number;
  /** Time taken to execute the filter */
  executionTimeMs: number;
  /** Whether this was from a preset */
  fromPreset?: string;
}

// =============================================================================
// API REQUEST/RESPONSE INTERFACES
// =============================================================================

/**
 * Request interface for advanced equipment filtering
 */
export interface AdvancedFilterRequest extends AdvancedFilters {
  /** Include metadata about the filter operation */
  includeMetadata?: boolean;
  /** Whether to use cached results if available */
  useCache?: boolean;
}

/**
 * Response interface for advanced filter operations
 */
export interface AdvancedFilterResponse<T> {
  /** Filtered data results */
  data: T[];
  /** Pagination information */
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  /** Filter operation metadata */
  metadata: FilterMetadata;
}

/**
 * Response for filter option endpoints
 */
export interface FilterPresetListResponse {
  /** Array of filter presets */
  presets: FilterPreset[];
  /** Total count of presets */
  totalCount: number;
  /** Pagination info */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface SharedFilterResponse {
  /** The shared preset */
  preset: FilterPreset;
  /** Whether the preset is accessible */
  accessible: boolean;
  /** Share token */
  shareToken: string;
}

export interface FilterOptionsResponse {
  /** Available site options */
  sites: FilterOption[];
  /** Available cell type options */
  cellTypes: FilterOption[];
  /** Available equipment type options */
  equipmentTypes: FilterOption[];
  /** Available make options */
  makes: FilterOption[];
  /** Available model options (filtered by selected makes) */
  models: FilterOption[];
  /** Available tag options with usage counts */
  tags: TagOption[];
}

/**
 * Individual filter option
 */
export interface FilterOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Number of equipment matching this option */
  count: number;
  /** Whether this option is currently selected */
  selected?: boolean;
}

/**
 * Tag option with additional metadata
 */
export interface TagOption extends FilterOption {
  /** Category or type of tag */
  category?: string;
  /** Color for visual display */
  color?: string;
  /** Usage frequency for sorting */
  frequency: number;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type for filter comparison operations
 */
export type FilterComparison = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';

/**
 * Type for filter field types
 */
export type FilterFieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'ip_address';

/**
 * Helper type for partial filter updates
 */
export type PartialAdvancedFilters = Partial<AdvancedFilters>;

/**
 * Helper type for filter transformation operations
 */
export type FilterTransform<T, U> = (filter: T) => U;

/**
 * Type for filter validation functions
 */
export type FilterValidator<T> = (value: T) => Promise<boolean> | boolean;

/**
 * Type for filter serialization functions
 */
export type FilterSerializer<T> = {
  serialize: (value: T) => string;
  deserialize: (value: string) => T | null;
};

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Error types that can occur during filter operations
 */
export enum FilterErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERFORMANCE_ERROR = 'PERFORMANCE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PRESET_ERROR = 'PRESET_ERROR',
  URL_ERROR = 'URL_ERROR',
}

/**
 * Filter operation error details
 */
export interface FilterError {
  /** Type of error that occurred */
  type: FilterErrorType;
  /** Human-readable error message */
  message: string;
  /** Technical details about the error */
  details?: Record<string, unknown>;
  /** Field that caused the error (if applicable) */
  field?: string;
  /** Suggested actions to resolve the error */
  suggestions?: string[];
}

// =============================================================================
// COMPONENT PROP INTERFACES
// =============================================================================

/**
 * Props for the main FilterPanel component
 */
export interface FilterPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Current filter state */
  filters: AdvancedFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: AdvancedFilters) => void;
  /** Available presets */
  presets: FilterPreset[];
  /** Callback when preset is selected */
  onPresetSelect: (preset: FilterPreset) => void;
  /** Callback to save current filters as preset */
  onPresetSave: (name: string, description?: string) => void;
  /** Whether the panel should show in mobile mode */
  mobile?: boolean;
}

/**
 * Props for individual filter section components
 */
export interface FilterSectionProps {
  /** Section title */
  title: string;
  /** Whether section is expanded */
  expanded: boolean;
  /** Callback when expansion state changes */
  onExpandChange: (expanded: boolean) => void;
  /** Section content */
  children: React.ReactNode;
  /** Badge count for active filters in this section */
  badge?: number;
  /** Whether this section is loading */
  loading?: boolean;
}

/**
 * Props for multi-select filter components
 */
export interface MultiSelectFilterProps<T> {
  /** Filter label */
  label: string;
  /** Available options */
  options: FilterOption[];
  /** Currently selected values */
  values: T[];
  /** Callback when selection changes */
  onChange: (values: T[]) => void;
  /** Whether options are loading */
  loading?: boolean;
  /** Whether the filter supports search */
  searchable?: boolean;
  /** Maximum height for option list */
  maxHeight?: number;
  /** Threshold for enabling virtualization */
  virtualizeThreshold?: number;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
}

/**
 * Props for filter chips component
 */
export interface FilterChipsProps {
  /** Current applied filters */
  filters: AdvancedFilters;
  /** Callback to remove a specific filter */
  onRemoveFilter: (filterType: keyof AdvancedFilters, value?: unknown) => void;
  /** Callback to clear all filters */
  onClearAll: () => void;
  /** Maximum number of chips to display before truncation */
  maxChips?: number;
  /** Whether to show the clear all button */
  showClearAll?: boolean;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * Return type for useAdvancedFilters hook
 */
export interface UseAdvancedFiltersReturn {
  /** Current filter state */
  filters: AdvancedFilters;
  /** Pending filters (during debouncing) */
  pendingFilters: Partial<AdvancedFilters>;
  /** Update filters with debouncing */
  updateFilters: (filters: Partial<AdvancedFilters>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Apply filters immediately (skip debouncing) */
  applyFilters: (filters: AdvancedFilters) => void;
  /** Whether filters are being applied */
  isApplying: boolean;
  /** Validation state */
  validation: FilterValidation;
}

/**
 * Return type for useFilterPresets hook
 */
export interface UseFilterPresetsReturn {
  /** Available presets */
  presets: FilterPreset[];
  /** Currently active preset */
  currentPreset: FilterPreset | null;
  /** Load all presets */
  loadPresets: () => Promise<void>;
  /** Save current filters as preset */
  savePreset: (name: string, description?: string) => Promise<void>;
  /** Apply a saved preset */
  applyPreset: (presetId: string) => Promise<void>;
  /** Delete a preset */
  deletePreset: (presetId: string) => Promise<void>;
  /** Whether presets are loading */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Return type for useFilterURL hook
 */
export interface UseFilterURLReturn {
  /** Sync filters to URL */
  syncToURL: (filters: AdvancedFilters) => void;
  /** Load filters from URL */
  syncFromURL: () => AdvancedFilters;
  /** Generate shareable link */
  generateShareLink: (filters: AdvancedFilters) => string;
  /** Parse shared link */
  parseShareLink: (url: string) => AdvancedFilters | null;
}

/**
 * Hierarchy TypeScript interfaces for Site Hierarchy Management
 * Story 4.5: Site Hierarchy Management
 */

import { Equipment } from './equipment';

/**
 * Site interface matching database schema
 * Represents a physical location/facility containing multiple cells
 */
export interface Site {
  /** Unique site identifier (UUID) */
  id: string;
  /** Site name - must be unique across all sites */
  name: string;
  /** ISO timestamp when site was created */
  createdAt: string;
  /** ISO timestamp when site was last updated */
  updatedAt: string;
  /** User ID who created this site */
  createdBy: string;
  /** User ID who last updated this site */
  updatedBy: string;

  // Computed fields for UI display (optional)
  /** Number of cells in this site */
  cellCount?: number;
  /** Total number of equipment across all cells in this site */
  equipmentCount?: number;
  /** Number of PLCs across all equipment in this site */
  plcCount?: number;
}

/**
 * Cell interface with site relationship
 * Represents a production cell or area within a site
 */
export interface Cell {
  /** Unique cell identifier (UUID) */
  id: string;
  /** Foreign key to parent site */
  siteId: string;
  /** Cell name within the site */
  name: string;
  /** Production line number - unique within site */
  lineNumber: string;
  /** ISO timestamp when cell was created */
  createdAt: string;
  /** ISO timestamp when cell was last updated */
  updatedAt: string;
  /** User ID who created this cell */
  createdBy: string;
  /** User ID who last updated this cell */
  updatedBy: string;

  // Denormalized site data for display (optional)
  /** Site name for display purposes */
  siteName?: string;

  // Computed fields for UI display (optional)
  /** Number of equipment units in this cell */
  equipmentCount?: number;
  /** Number of PLCs in this cell */
  plcCount?: number;
}

/**
 * Extended site interface with full relationship data
 */
export interface SiteWithDetails extends Site {
  /** Array of cells in this site */
  cells: Cell[];
  /** Array of equipment across all cells (flattened) */
  equipment?: Equipment[];
}

/**
 * Extended cell interface with full relationship data
 */
export interface CellWithDetails extends Cell {
  /** Parent site information */
  site: Site;
  /** Array of equipment in this cell */
  equipment: Equipment[];
}

/**
 * Hierarchy node for tree display
 * Represents any node in the site→cell→equipment tree structure
 */
export interface HierarchyNode {
  /** Unique identifier for this node */
  id: string;
  /** Type of hierarchy node */
  type: 'site' | 'cell' | 'equipment';
  /** Display name for this node */
  name: string;
  /** Child nodes (empty array if leaf node) */
  children: HierarchyNode[];
  /** Original data object for this node */
  metadata: Site | Cell | Equipment;

  // UI state for tree component
  /** Whether this node is expanded in the tree */
  expanded?: boolean;
  /** Whether this node is selected */
  selected?: boolean;
  /** Whether this node matches current search/filter */
  visible?: boolean;
  /** Depth level in the tree (0=site, 1=cell, 2=equipment) */
  level?: number;
  /** Whether this node has children that are loading */
  loading?: boolean;
  /** Error state for this node */
  error?: string;
}

/**
 * Filter state for hierarchy operations
 */
export interface HierarchyFilters {
  /** Filter to specific site(s) */
  siteIds?: string[];
  /** Filter to specific cell(s) */
  cellIds?: string[];
  /** Text search across all hierarchy levels */
  search?: string;
  /** Show sites/cells with no equipment */
  showEmpty?: boolean;
  /** Default expansion level (0=collapsed, 1=sites, 2=cells, 3=equipment) */
  expandLevel?: number;
  /** Include equipment count in display */
  showCounts?: boolean;
}

/**
 * Site creation data transfer object
 */
export interface CreateSiteDto {
  /** Site name - must be unique */
  name: string;
}

/**
 * Site update data transfer object
 */
export interface UpdateSiteDto {
  /** Updated site name */
  name: string;
  /** Timestamp for optimistic locking */
  updatedAt: string;
}

/**
 * Cell creation data transfer object
 */
export interface CreateCellDto {
  /** Parent site ID */
  siteId: string;
  /** Cell name */
  name: string;
  /** Production line number - unique within site */
  lineNumber: string;
}

/**
 * Cell update data transfer object
 */
export interface UpdateCellDto {
  /** Updated cell name */
  name: string;
  /** Updated line number */
  lineNumber: string;
  /** Timestamp for optimistic locking */
  updatedAt: string;
}

/**
 * Site statistics for dashboard display
 */
export interface SiteStatistics {
  /** Site identifier */
  siteId: string;
  /** Site name */
  siteName: string;
  /** Number of cells in site */
  cellCount: number;
  /** Total equipment across all cells */
  equipmentCount: number;
  /** Total PLCs across all equipment */
  plcCount: number;
  /** Most recent activity timestamp */
  lastActivity: string;
  /** Average equipment per cell */
  avgEquipmentPerCell: number;
  /** Most common equipment type */
  topEquipmentType?: string;
}

/**
 * Cell statistics for detailed view
 */
export interface CellStatistics {
  /** Cell identifier */
  cellId: string;
  /** Cell name */
  cellName: string;
  /** Parent site name */
  siteName: string;
  /** Equipment count in this cell */
  equipmentCount: number;
  /** PLC count in this cell */
  plcCount: number;
  /** Most recent activity timestamp */
  lastActivity: string;
  /** Equipment types breakdown */
  equipmentTypes: Record<string, number>;
}

/**
 * Hierarchy validation result
 */
export interface HierarchyValidationResult {
  /** Whether the hierarchy is valid */
  isValid: boolean;
  /** Array of validation errors */
  errors: HierarchyValidationError[];
  /** Array of warnings */
  warnings: HierarchyValidationWarning[];
}

/**
 * Hierarchy validation error
 */
export interface HierarchyValidationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Field that caused the error */
  field?: string;
  /** Entity ID related to the error */
  entityId?: string;
  /** Entity type related to the error */
  entityType?: 'site' | 'cell' | 'equipment';
}

/**
 * Hierarchy validation warning
 */
export interface HierarchyValidationWarning {
  /** Warning code for programmatic handling */
  code: string;
  /** Human-readable warning message */
  message: string;
  /** Affected entity information */
  entityId?: string;
  /** Entity type */
  entityType?: 'site' | 'cell' | 'equipment';
}

/**
 * Orphaned record detection result
 */
export interface OrphanedRecord {
  /** Type of orphaned record */
  type: 'cell' | 'equipment';
  /** Record identifier */
  id: string;
  /** Record name */
  name: string;
  /** Missing parent information */
  missingParent: {
    type: 'site' | 'cell';
    id: string;
    name?: string;
  };
  /** Suggested action for resolution */
  suggestedAction: 'reassign' | 'delete' | 'create_parent';
}

/**
 * Site suggestion for autocomplete
 */
export interface SiteSuggestion {
  /** Site ID */
  id: string;
  /** Site name */
  name: string;
  /** Number of cells in site */
  cellCount: number;
  /** Whether this is a recently used site */
  recentlyUsed?: boolean;
}

/**
 * Cell suggestion for autocomplete
 */
export interface CellSuggestion {
  /** Cell ID */
  id: string;
  /** Cell name */
  name: string;
  /** Line number */
  lineNumber: string;
  /** Parent site name */
  siteName: string;
  /** Number of equipment in cell */
  equipmentCount: number;
  /** Whether this is a recently used cell */
  recentlyUsed?: boolean;
}

/**
 * Hierarchy breadcrumb item
 */
export interface HierarchyBreadcrumb {
  /** Breadcrumb level */
  level: 'site' | 'cell' | 'equipment';
  /** Display label */
  label: string;
  /** Entity ID */
  id: string;
  /** Navigation path */
  path: string;
  /** Whether this is the current/active level */
  active: boolean;
}

/**
 * Hierarchy location context
 * Used to represent a complete hierarchy path
 */
export interface HierarchyLocation {
  /** Site information */
  site: {
    id: string;
    name: string;
  };
  /** Cell information */
  cell: {
    id: string;
    name: string;
    lineNumber: string;
  };
  /** Full hierarchy path for display */
  path: string; // e.g., "Plant-A / Assembly-Line-1"
}

/**
 * Hierarchy service error interface
 */
export interface HierarchyServiceError {
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Error code for programmatic handling */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Field-specific errors for forms */
  fieldErrors?: Record<string, string[]>;
}

/**
 * Paginated hierarchy response
 */
export interface PaginatedHierarchyResponse<T> {
  /** Array of data items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page (1-based) */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Total number of items */
    totalItems: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there are more pages */
    hasNext: boolean;
    /** Whether there are previous pages */
    hasPrev: boolean;
  };
}

/**
 * Hierarchy tree loading state
 */
export interface HierarchyTreeState {
  /** Tree nodes */
  nodes: HierarchyNode[];
  /** Currently expanded node IDs */
  expandedNodes: Set<string>;
  /** Currently selected node IDs */
  selectedNodes: Set<string>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Search query */
  searchQuery: string;
  /** Active filters */
  filters: HierarchyFilters;
}

/**
 * Hierarchy management permissions
 */
export interface HierarchyPermissions {
  /** Can view sites and hierarchies */
  canRead: boolean;
  /** Can create new sites */
  canCreateSites: boolean;
  /** Can modify existing sites */
  canUpdateSites: boolean;
  /** Can delete sites */
  canDeleteSites: boolean;
  /** Can create new cells */
  canCreateCells: boolean;
  /** Can modify existing cells */
  canUpdateCells: boolean;
  /** Can delete cells */
  canDeleteCells: boolean;
  /** Can perform bulk operations */
  canBulkEdit: boolean;
  /** Can manage hierarchy structure */
  canManageHierarchy: boolean;
}

/**
 * Bulk operation request for hierarchy items
 */
export interface HierarchyBulkOperation {
  /** Type of operation */
  operation: 'delete' | 'move' | 'update' | 'export';
  /** Target entity type */
  entityType: 'site' | 'cell' | 'equipment';
  /** Array of entity IDs to operate on */
  entityIds: string[];
  /** Operation-specific parameters */
  params?: Record<string, unknown>;
}

/**
 * Bulk operation result
 */
export interface HierarchyBulkResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Array of success details */
  successes: Array<{
    entityId: string;
    entityName: string;
    result: unknown;
  }>;
  /** Array of failure details */
  failures: Array<{
    entityId: string;
    entityName: string;
    error: string;
  }>;
}

// Re-export Equipment types from existing equipment module for convenience
export type { Equipment, EquipmentWithDetails, EquipmentType } from './equipment';

/**
 * Utility type for hierarchy path string
 * Format: "SiteName / CellName"
 */
export type HierarchyPath = string;

/**
 * Utility type for hierarchy level
 */
export type HierarchyLevel = 'site' | 'cell' | 'equipment';

/**
 * Utility type for hierarchy node ID
 */
export type HierarchyNodeId = string;

/**
 * Utility type for hierarchy filter keys
 */
export type HierarchyFilterKey = keyof HierarchyFilters;

/**
 * Type guard for Site objects
 */
export function isSite(obj: unknown): obj is Site {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'createdAt' in obj &&
    'createdBy' in obj &&
    !('siteId' in obj) // Distinguishes from Cell
  );
}

/**
 * Type guard for Cell objects
 */
export function isCell(obj: unknown): obj is Cell {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'siteId' in obj &&
    'lineNumber' in obj
  );
}

/**
 * Type guard for HierarchyNode objects
 */
export function isHierarchyNode(obj: unknown): obj is HierarchyNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'name' in obj &&
    'children' in obj &&
    'metadata' in obj
  );
}

/**
 * Utility function to create hierarchy path string
 */
export function createHierarchyPath(siteName: string, cellName?: string): string {
  return cellName ? `${siteName} / ${cellName}` : siteName;
}

/**
 * Utility function to parse hierarchy path string
 */
export function parseHierarchyPath(path: string): {
  siteName: string;
  cellName?: string;
} {
  const parts = path.split(' / ').map(part => part.trim());
  return {
    siteName: parts[0],
    cellName: parts[1] || undefined,
  };
}

/**
 * Utility function to get hierarchy level from node type
 */
export function getHierarchyLevel(nodeType: HierarchyNode['type']): number {
  switch (nodeType) {
    case 'site':
      return 0;
    case 'cell':
      return 1;
    case 'equipment':
      return 2;
    default:
      return -1;
  }
}

/**
 * Utility function to format hierarchy statistics for display
 */
export function formatHierarchyStats(stats: SiteStatistics): string {
  const parts = [];
  if (stats.cellCount > 0) {
    parts.push(`${stats.cellCount} cell${stats.cellCount !== 1 ? 's' : ''}`);
  }
  if (stats.equipmentCount > 0) {
    parts.push(`${stats.equipmentCount} equipment`);
  }
  if (stats.plcCount > 0) {
    parts.push(`${stats.plcCount} PLC${stats.plcCount !== 1 ? 's' : ''}`);
  }
  return parts.join(', ') || 'No equipment';
}

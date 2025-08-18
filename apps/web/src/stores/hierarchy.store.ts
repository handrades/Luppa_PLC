/**
 * Hierarchy Zustand Store
 * Manages state for site hierarchy operations
 * Story 4.5: Site Hierarchy Management
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
// Temporarily removing immer to fix build issue
import { hierarchyService } from '../services/hierarchy.service';
import {
  Cell,
  CellStatistics,
  CellSuggestion,
  CellWithDetails,
  CreateCellDto,
  CreateSiteDto,
  HierarchyBulkOperation,
  HierarchyBulkResult,
  HierarchyFilters,
  HierarchyLocation,
  HierarchyNode,
  HierarchyServiceError,
  HierarchyTreeState,
  HierarchyValidationResult,
  OrphanedRecord,
  Site,
  SiteStatistics,
  SiteSuggestion,
  SiteWithDetails,
  UpdateCellDto,
  UpdateSiteDto,
} from '../types/hierarchy';

/**
 * Hierarchy store state interface
 */
interface HierarchyState {
  // Core data
  sites: Site[];
  cells: Cell[];
  hierarchyTree: HierarchyNode[];

  // Current selection state
  selectedSiteId: string | null;
  selectedCellId: string | null;
  selectedNodeIds: Set<string>;
  currentLocation: HierarchyLocation | null;

  // Tree state
  expandedNodes: Set<string>;
  treeState: HierarchyTreeState;

  // Filters and search
  filters: HierarchyFilters;
  searchQuery: string;
  appliedFilters: HierarchyFilters;

  // Loading states
  isLoadingSites: boolean;
  isLoadingCells: boolean;
  isLoadingTree: boolean;
  isLoadingStatistics: boolean;
  isValidating: boolean;

  // Operation states
  isCreatingSite: boolean;
  isUpdatingSite: boolean;
  isDeletingSite: boolean;
  isCreatingCell: boolean;
  isUpdatingCell: boolean;
  isDeletingCell: boolean;
  isBulkOperating: boolean;

  // Error handling
  error: HierarchyServiceError | null;
  siteErrors: Record<string, string>;
  cellErrors: Record<string, string>;
  validationResults: HierarchyValidationResult | null;
  orphanedRecords: OrphanedRecord[];

  // Statistics and metadata
  hierarchyStatistics: {
    totalSites: number;
    totalCells: number;
    totalEquipment: number;
    totalPlcs: number;
    avgCellsPerSite: number;
    avgEquipmentPerCell: number;
  } | null;
  siteStatistics: Record<string, SiteStatistics>;
  cellStatistics: Record<string, CellStatistics>;

  // Autocomplete data
  siteSuggestions: SiteSuggestion[];
  cellSuggestions: CellSuggestion[];

  // Pagination
  sitesPagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  cellsPagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // User preferences (persisted)
  preferences: {
    defaultExpandLevel: number;
    defaultPageSize: number;
    showEmptyNodes: boolean;
    autoRefresh: boolean;
    savedFilters: Array<{ name: string; filters: HierarchyFilters }>;
  };
}

/**
 * Hierarchy store actions interface
 */
interface HierarchyActions {
  // Data loading actions
  loadSites: (params?: { page?: number; search?: string; includeEmpty?: boolean }) => Promise<void>;
  loadCells: (params?: { siteId?: string; page?: number; search?: string }) => Promise<void>;
  loadHierarchyTree: (params?: {
    expandLevel?: number;
    siteId?: string;
    search?: string;
  }) => Promise<void>;
  refreshHierarchy: () => Promise<void>;

  // Selection actions
  selectSite: (siteId: string | null) => void;
  selectCell: (cellId: string | null) => void;
  selectNode: (nodeId: string) => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  setCurrentLocation: (location: HierarchyLocation | null) => void;

  // Tree navigation actions
  toggleNodeExpansion: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandToLevel: (level: number) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Filter and search actions
  setFilters: (filters: Partial<HierarchyFilters>) => void;
  updateFilter: (key: keyof HierarchyFilters, value: unknown) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  setSearchQuery: (query: string) => void;
  saveFilterPreset: (name: string, filters: HierarchyFilters) => void;
  loadFilterPreset: (name: string) => void;
  deleteFilterPreset: (name: string) => void;

  // Site CRUD actions
  createSite: (data: CreateSiteDto) => Promise<Site>;
  updateSite: (id: string, data: UpdateSiteDto) => Promise<Site>;
  deleteSite: (id: string) => Promise<void>;
  getSiteById: (id: string) => Promise<SiteWithDetails>;
  loadSiteStatistics: (id: string) => Promise<SiteStatistics>;

  // Cell CRUD actions
  createCell: (data: CreateCellDto) => Promise<Cell>;
  updateCell: (id: string, data: UpdateCellDto) => Promise<Cell>;
  deleteCell: (id: string) => Promise<void>;
  getCellById: (id: string) => Promise<CellWithDetails>;
  loadCellStatistics: (id: string) => Promise<CellStatistics>;
  getCellsBySite: (siteId: string) => Promise<Cell[]>;

  // Validation actions
  validateHierarchy: () => Promise<HierarchyValidationResult>;
  detectOrphanedRecords: () => Promise<OrphanedRecord[]>;
  validateSiteName: (name: string, excludeId?: string) => Promise<boolean>;
  validateCellLineNumber: (
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ) => Promise<boolean>;

  // Autocomplete actions
  searchSiteSuggestions: (query: string) => Promise<SiteSuggestion[]>;
  searchCellSuggestions: (siteId: string, query: string) => Promise<CellSuggestion[]>;

  // Bulk operations
  performBulkOperation: (operation: HierarchyBulkOperation) => Promise<HierarchyBulkResult>;
  bulkDeleteSites: (siteIds: string[]) => Promise<HierarchyBulkResult>;
  bulkDeleteCells: (cellIds: string[]) => Promise<HierarchyBulkResult>;

  // Statistics actions
  loadHierarchyStatistics: () => Promise<void>;
  refreshStatistics: () => Promise<void>;

  // Error handling
  setError: (error: HierarchyServiceError | null) => void;
  clearError: () => void;
  setSiteError: (siteId: string, error: string) => void;
  clearSiteError: (siteId: string) => void;
  setCellError: (cellId: string, error: string) => void;
  clearCellError: (cellId: string) => void;

  // Utility actions
  reset: () => void;
  updatePreferences: (preferences: Partial<HierarchyState['preferences']>) => void;

  // Computed selectors
  getSelectedSite: () => Site | null;
  getSelectedCell: () => Cell | null;
  getSitesBySearch: (query: string) => Site[];
  getCellsBySearch: (query: string) => Cell[];
  getFilteredTree: () => HierarchyNode[];
  getHierarchyPath: (siteId?: string, cellId?: string) => string;
  getTotalSelectedNodes: () => number;
  hasUnsavedChanges: () => boolean;
}

/**
 * Combined store interface
 */
type HierarchyStore = HierarchyState & HierarchyActions;

/**
 * Initial state values
 */
const initialState: HierarchyState = {
  // Core data
  sites: [],
  cells: [],
  hierarchyTree: [],

  // Current selection state
  selectedSiteId: null,
  selectedCellId: null,
  selectedNodeIds: new Set(),
  currentLocation: null,

  // Tree state
  expandedNodes: new Set(),
  treeState: {
    nodes: [],
    expandedNodes: new Set(),
    selectedNodes: new Set(),
    isLoading: false,
    error: null,
    searchQuery: '',
    filters: {},
  },

  // Filters and search
  filters: {},
  searchQuery: '',
  appliedFilters: {},

  // Loading states
  isLoadingSites: false,
  isLoadingCells: false,
  isLoadingTree: false,
  isLoadingStatistics: false,
  isValidating: false,

  // Operation states
  isCreatingSite: false,
  isUpdatingSite: false,
  isDeletingSite: false,
  isCreatingCell: false,
  isUpdatingCell: false,
  isDeletingCell: false,
  isBulkOperating: false,

  // Error handling
  error: null,
  siteErrors: {},
  cellErrors: {},
  validationResults: null,
  orphanedRecords: [],

  // Statistics and metadata
  hierarchyStatistics: null,
  siteStatistics: {},
  cellStatistics: {},

  // Autocomplete data
  siteSuggestions: [],
  cellSuggestions: [],

  // Pagination
  sitesPagination: {
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },
  cellsPagination: {
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },

  // User preferences (persisted)
  preferences: {
    defaultExpandLevel: 1,
    defaultPageSize: 50,
    showEmptyNodes: false,
    autoRefresh: false,
    savedFilters: [],
  },
};

/**
 * Create the hierarchy store with middleware
 */
export const useHierarchyStore = create<HierarchyStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        // Data loading actions
        loadSites: async (params = {}) => {
          set(state => ({
            ...state,
            isLoadingSites: true,
            error: null,
          }));

          try {
            const response = await hierarchyService.getSites({
              page: params.page || get().sitesPagination.page,
              pageSize: get().preferences.defaultPageSize,
              search: params.search || get().searchQuery,
              includeEmpty: params.includeEmpty ?? get().preferences.showEmptyNodes,
            });

            set(state => ({
              ...state,
              sites: response.data,
              sitesPagination: response.pagination,
              isLoadingSites: false,
            }));
          } catch (error) {
            set(state => ({
              ...state,
              error: error as HierarchyServiceError,
              isLoadingSites: false,
            }));
          }
        },

        loadCells: async (params = {}) => {
          set(state => {
            state.isLoadingCells = true;
            state.error = null;
          });

          try {
            const response = await hierarchyService.getCells({
              siteId: params.siteId || get().selectedSiteId || undefined,
              page: params.page || get().cellsPagination.page,
              pageSize: get().preferences.defaultPageSize,
              search: params.search || get().searchQuery,
            });

            set(state => {
              state.cells = response.data;
              state.cellsPagination = response.pagination;
              state.isLoadingCells = false;
            });
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isLoadingCells = false;
            });
          }
        },

        loadHierarchyTree: async (params = {}) => {
          set(state => {
            state.isLoadingTree = true;
            state.error = null;
          });

          try {
            const response = await hierarchyService.getHierarchyTree({
              expandLevel: params.expandLevel || get().preferences.defaultExpandLevel,
              siteId: params.siteId || get().selectedSiteId || undefined,
              search: params.search || get().searchQuery,
              includeEmpty: get().preferences.showEmptyNodes,
              includeCounts: true,
            });

            set(state => {
              state.hierarchyTree = response.tree;
              state.hierarchyStatistics = response.statistics;
              state.isLoadingTree = false;

              // Update tree state
              state.treeState.nodes = response.tree;
              state.treeState.isLoading = false;
            });
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isLoadingTree = false;
              state.treeState.error = (error as HierarchyServiceError).message;
              state.treeState.isLoading = false;
            });
          }
        },

        refreshHierarchy: async () => {
          const actions = get();
          await Promise.all([
            actions.loadSites(),
            actions.loadCells(),
            actions.loadHierarchyTree(),
          ]);
        },

        // Selection actions
        selectSite: siteId => {
          set(state => {
            state.selectedSiteId = siteId;
            // Clear cell selection when site changes
            if (state.selectedCellId) {
              state.selectedCellId = null;
              state.currentLocation = null;
            }
            // Update current location if site is selected
            if (siteId) {
              const site = state.sites.find(s => s.id === siteId);
              if (site && !state.selectedCellId) {
                state.currentLocation = {
                  site: { id: site.id, name: site.name },
                  cell: { id: '', name: '', lineNumber: '' },
                  path: site.name,
                };
              }
            } else {
              state.currentLocation = null;
            }
          });

          // Auto-load cells for selected site
          if (siteId) {
            get().loadCells({ siteId });
          }
        },

        selectCell: cellId => {
          set(state => {
            state.selectedCellId = cellId;

            // Update current location
            if (cellId) {
              const cell = state.cells.find(c => c.id === cellId);
              const site = state.sites.find(s => s.id === cell?.siteId);

              if (cell && site) {
                state.currentLocation = {
                  site: { id: site.id, name: site.name },
                  cell: {
                    id: cell.id,
                    name: cell.name,
                    lineNumber: cell.lineNumber,
                  },
                  path: `${site.name} / ${cell.name}`,
                };
                // Also set site selection
                state.selectedSiteId = site.id;
              }
            }
          });
        },

        selectNode: nodeId => {
          set(state => {
            if (state.selectedNodeIds.has(nodeId)) {
              state.selectedNodeIds.delete(nodeId);
            } else {
              state.selectedNodeIds.add(nodeId);
            }
            state.treeState.selectedNodes = new Set(state.selectedNodeIds);
          });
        },

        selectMultipleNodes: nodeIds => {
          set(state => {
            nodeIds.forEach(id => state.selectedNodeIds.add(id));
            state.treeState.selectedNodes = new Set(state.selectedNodeIds);
          });
        },

        clearSelection: () => {
          set(state => {
            state.selectedSiteId = null;
            state.selectedCellId = null;
            state.selectedNodeIds.clear();
            state.currentLocation = null;
            state.treeState.selectedNodes.clear();
          });
        },

        setCurrentLocation: location => {
          set(state => {
            state.currentLocation = location;
            if (location) {
              state.selectedSiteId = location.site.id;
              state.selectedCellId = location.cell.id;
            }
          });
        },

        // Tree navigation actions
        toggleNodeExpansion: nodeId => {
          set(state => {
            if (state.expandedNodes.has(nodeId)) {
              state.expandedNodes.delete(nodeId);
            } else {
              state.expandedNodes.add(nodeId);
            }
            state.treeState.expandedNodes = new Set(state.expandedNodes);
          });
        },

        expandNode: nodeId => {
          set(state => {
            state.expandedNodes.add(nodeId);
            state.treeState.expandedNodes = new Set(state.expandedNodes);
          });
        },

        collapseNode: nodeId => {
          set(state => {
            state.expandedNodes.delete(nodeId);
            state.treeState.expandedNodes = new Set(state.expandedNodes);
          });
        },

        expandToLevel: level => {
          set(state => {
            const expandNodes = (nodes: HierarchyNode[], currentLevel: number) => {
              nodes.forEach(node => {
                if (currentLevel < level) {
                  state.expandedNodes.add(node.id);
                  if (node.children) {
                    expandNodes(node.children, currentLevel + 1);
                  }
                }
              });
            };

            expandNodes(state.hierarchyTree, 0);
            state.treeState.expandedNodes = new Set(state.expandedNodes);
          });
        },

        expandAll: () => {
          set(state => {
            const expandAllNodes = (nodes: HierarchyNode[]) => {
              nodes.forEach(node => {
                state.expandedNodes.add(node.id);
                if (node.children) {
                  expandAllNodes(node.children);
                }
              });
            };

            expandAllNodes(state.hierarchyTree);
            state.treeState.expandedNodes = new Set(state.expandedNodes);
          });
        },

        collapseAll: () => {
          set(state => {
            state.expandedNodes.clear();
            state.treeState.expandedNodes.clear();
          });
        },

        // Filter and search actions
        setFilters: filters => {
          set(state => {
            state.filters = { ...state.filters, ...filters };
          });
        },

        updateFilter: (key, value) => {
          set(state => {
            state.filters[key] = value;
          });
        },

        clearFilters: () => {
          set(state => {
            state.filters = {};
            state.appliedFilters = {};
            state.searchQuery = '';
            state.treeState.searchQuery = '';
          });
        },

        applyFilters: () => {
          set(state => {
            state.appliedFilters = { ...state.filters };
            state.treeState.filters = { ...state.filters };
          });

          // Reload data with applied filters
          get().loadHierarchyTree();
        },

        setSearchQuery: query => {
          set(state => {
            state.searchQuery = query;
            state.treeState.searchQuery = query;
          });
        },

        saveFilterPreset: (name, filters) => {
          set(state => {
            const existingIndex = state.preferences.savedFilters.findIndex(f => f.name === name);
            if (existingIndex >= 0) {
              state.preferences.savedFilters[existingIndex] = { name, filters };
            } else {
              state.preferences.savedFilters.push({ name, filters });
            }
          });
        },

        loadFilterPreset: name => {
          const preset = get().preferences.savedFilters.find(f => f.name === name);
          if (preset) {
            get().setFilters(preset.filters);
            get().applyFilters();
          }
        },

        deleteFilterPreset: name => {
          set(state => {
            state.preferences.savedFilters = state.preferences.savedFilters.filter(
              f => f.name !== name
            );
          });
        },

        // Site CRUD actions
        createSite: async data => {
          set(state => {
            state.isCreatingSite = true;
            state.error = null;
          });

          try {
            const site = await hierarchyService.createSite(data);

            set(state => {
              state.sites.push(site);
              state.isCreatingSite = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();

            return site;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isCreatingSite = false;
            });
            throw error;
          }
        },

        updateSite: async (id, data) => {
          set(state => {
            state.isUpdatingSite = true;
            state.error = null;
          });

          try {
            const site = await hierarchyService.updateSite(id, data);

            set(state => {
              const index = state.sites.findIndex(s => s.id === id);
              if (index >= 0) {
                state.sites[index] = site;
              }
              state.isUpdatingSite = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();

            return site;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isUpdatingSite = false;
            });
            throw error;
          }
        },

        deleteSite: async id => {
          set(state => {
            state.isDeletingSite = true;
            state.error = null;
          });

          try {
            await hierarchyService.deleteSite(id);

            set(state => {
              state.sites = state.sites.filter(s => s.id !== id);
              // Clear selection if deleted site was selected
              if (state.selectedSiteId === id) {
                state.selectedSiteId = null;
                state.selectedCellId = null;
                state.currentLocation = null;
              }
              state.isDeletingSite = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isDeletingSite = false;
            });
            throw error;
          }
        },

        getSiteById: async id => {
          return hierarchyService.getSiteById(id);
        },

        loadSiteStatistics: async id => {
          try {
            const stats = await hierarchyService.getSiteStatistics(id);
            set(state => {
              state.siteStatistics[id] = stats;
            });
            return stats;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
            });
            throw error;
          }
        },

        // Cell CRUD actions
        createCell: async data => {
          set(state => {
            state.isCreatingCell = true;
            state.error = null;
          });

          try {
            const cell = await hierarchyService.createCell(data);

            set(state => {
              state.cells.push(cell);
              state.isCreatingCell = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();

            return cell;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isCreatingCell = false;
            });
            throw error;
          }
        },

        updateCell: async (id, data) => {
          set(state => {
            state.isUpdatingCell = true;
            state.error = null;
          });

          try {
            const cell = await hierarchyService.updateCell(id, data);

            set(state => {
              const index = state.cells.findIndex(c => c.id === id);
              if (index >= 0) {
                state.cells[index] = cell;
              }
              state.isUpdatingCell = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();

            return cell;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isUpdatingCell = false;
            });
            throw error;
          }
        },

        deleteCell: async id => {
          set(state => {
            state.isDeletingCell = true;
            state.error = null;
          });

          try {
            await hierarchyService.deleteCell(id);

            set(state => {
              state.cells = state.cells.filter(c => c.id !== id);
              // Clear selection if deleted cell was selected
              if (state.selectedCellId === id) {
                state.selectedCellId = null;
                state.currentLocation = state.selectedSiteId
                  ? {
                      site: state.currentLocation?.site || { id: '', name: '' },
                      cell: { id: '', name: '', lineNumber: '' },
                      path: state.currentLocation?.site.name || '',
                    }
                  : null;
              }
              state.isDeletingCell = false;
            });

            // Refresh hierarchy tree
            get().loadHierarchyTree();
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isDeletingCell = false;
            });
            throw error;
          }
        },

        getCellById: async id => {
          return hierarchyService.getCellById(id);
        },

        loadCellStatistics: async id => {
          try {
            const stats = await hierarchyService.getCellStatistics(id);
            set(state => {
              state.cellStatistics[id] = stats;
            });
            return stats;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
            });
            throw error;
          }
        },

        getCellsBySite: async siteId => {
          return hierarchyService.getCellsBySite(siteId);
        },

        // Validation actions
        validateHierarchy: async () => {
          set(state => {
            state.isValidating = true;
          });

          try {
            const result = await hierarchyService.validateHierarchy({
              checkOrphans: true,
              checkConstraints: true,
              checkCounts: true,
            });

            set(state => {
              state.validationResults = result;
              state.isValidating = false;
            });

            return result;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isValidating = false;
            });
            throw error;
          }
        },

        detectOrphanedRecords: async () => {
          try {
            const orphans = await hierarchyService.detectOrphanedRecords();
            set(state => {
              state.orphanedRecords = orphans;
            });
            return orphans;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
            });
            throw error;
          }
        },

        validateSiteName: async (name, excludeId) => {
          return hierarchyService.validateSiteUniqueness(name, excludeId);
        },

        validateCellLineNumber: async (siteId, lineNumber, excludeId) => {
          return hierarchyService.validateCellUniqueness(siteId, lineNumber, excludeId);
        },

        // Autocomplete actions
        searchSiteSuggestions: async query => {
          try {
            const suggestions = await hierarchyService.getSiteSuggestions(query);
            set(state => {
              state.siteSuggestions = suggestions;
            });
            return suggestions;
          } catch (error) {
            // Don't set error for autocomplete failures
            return [];
          }
        },

        searchCellSuggestions: async (siteId, query) => {
          try {
            const suggestions = await hierarchyService.getCellSuggestions(siteId, query);
            set(state => {
              state.cellSuggestions = suggestions;
            });
            return suggestions;
          } catch (error) {
            // Don't set error for autocomplete failures
            return [];
          }
        },

        // Bulk operations
        performBulkOperation: async operation => {
          set(state => {
            state.isBulkOperating = true;
            state.error = null;
          });

          try {
            const result = await hierarchyService.performBulkOperation(operation);

            set(state => {
              state.isBulkOperating = false;
            });

            // Refresh data after bulk operation
            await get().refreshHierarchy();

            return result;
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isBulkOperating = false;
            });
            throw error;
          }
        },

        bulkDeleteSites: async siteIds => {
          return get().performBulkOperation({
            operation: 'delete',
            entityType: 'site',
            entityIds: siteIds,
          });
        },

        bulkDeleteCells: async cellIds => {
          return get().performBulkOperation({
            operation: 'delete',
            entityType: 'cell',
            entityIds: cellIds,
          });
        },

        // Statistics actions
        loadHierarchyStatistics: async () => {
          set(state => {
            state.isLoadingStatistics = true;
          });

          try {
            const stats = await hierarchyService.getHierarchyStatistics();
            set(state => {
              state.hierarchyStatistics = stats;
              state.isLoadingStatistics = false;
            });
          } catch (error) {
            set(state => {
              state.error = error as HierarchyServiceError;
              state.isLoadingStatistics = false;
            });
          }
        },

        refreshStatistics: async () => {
          await get().loadHierarchyStatistics();
        },

        // Error handling
        setError: error => {
          set(state => {
            state.error = error;
          });
        },

        clearError: () => {
          set(state => {
            state.error = null;
          });
        },

        setSiteError: (siteId, error) => {
          set(state => {
            state.siteErrors[siteId] = error;
          });
        },

        clearSiteError: siteId => {
          set(state => {
            delete state.siteErrors[siteId];
          });
        },

        setCellError: (cellId, error) => {
          set(state => {
            state.cellErrors[cellId] = error;
          });
        },

        clearCellError: cellId => {
          set(state => {
            delete state.cellErrors[cellId];
          });
        },

        // Utility actions
        reset: () => {
          set(initialState);
        },

        updatePreferences: preferences => {
          set(state => {
            state.preferences = { ...state.preferences, ...preferences };
          });
        },

        // Computed selectors
        getSelectedSite: () => {
          const state = get();
          return state.selectedSiteId
            ? state.sites.find(s => s.id === state.selectedSiteId) || null
            : null;
        },

        getSelectedCell: () => {
          const state = get();
          return state.selectedCellId
            ? state.cells.find(c => c.id === state.selectedCellId) || null
            : null;
        },

        getSitesBySearch: query => {
          const state = get();
          if (!query.trim()) return state.sites;
          const lowerQuery = query.toLowerCase();
          return state.sites.filter(site => site.name.toLowerCase().includes(lowerQuery));
        },

        getCellsBySearch: query => {
          const state = get();
          if (!query.trim()) return state.cells;
          const lowerQuery = query.toLowerCase();
          return state.cells.filter(
            cell =>
              cell.name.toLowerCase().includes(lowerQuery) ||
              cell.lineNumber.toLowerCase().includes(lowerQuery) ||
              cell.siteName?.toLowerCase().includes(lowerQuery)
          );
        },

        getFilteredTree: () => {
          const state = get();
          // This would implement tree filtering logic based on current filters
          // For now, return the full tree
          return state.hierarchyTree;
        },

        getHierarchyPath: (siteId, cellId) => {
          const state = get();
          const site = siteId ? state.sites.find(s => s.id === siteId) : null;
          const cell = cellId ? state.cells.find(c => c.id === cellId) : null;

          if (site && cell) {
            return `${site.name} / ${cell.name}`;
          } else if (site) {
            return site.name;
          }
          return '';
        },

        getTotalSelectedNodes: () => {
          return get().selectedNodeIds.size;
        },

        hasUnsavedChanges: () => {
          const state = get();
          return JSON.stringify(state.filters) !== JSON.stringify(state.appliedFilters);
        },
      })),
      {
        name: 'hierarchy-store',
        partialize: state => ({
          // Only persist user preferences and some UI state
          preferences: state.preferences,
          expandedNodes: Array.from(state.expandedNodes),
          filters: state.filters,
        }),
        onRehydrateStorage: () => state => {
          if (state) {
            // Convert persisted arrays back to Sets
            state.expandedNodes = new Set(state.expandedNodes || []);
            state.selectedNodeIds = new Set();
            state.treeState.expandedNodes = new Set(state.expandedNodes);
            state.treeState.selectedNodes = new Set();
          }
        },
      }
    ),
    {
      name: 'hierarchy-store',
    }
  )
);

/**
 * Selector hooks for common use cases
 */
export const useSelectedSite = () => useHierarchyStore(state => state.getSelectedSite());
export const useSelectedCell = () => useHierarchyStore(state => state.getSelectedCell());
export const useCurrentLocation = () => useHierarchyStore(state => state.currentLocation);
export const useHierarchyFilters = () => useHierarchyStore(state => state.filters);
export const useHierarchyTree = () => useHierarchyStore(state => state.hierarchyTree);
export const useHierarchyStatistics = () => useHierarchyStore(state => state.hierarchyStatistics);

/**
 * Shallow selectors for performance
 */
export const useHierarchyStoreShallow = () => useHierarchyStore();

/**
 * Default export
 */
export default useHierarchyStore;

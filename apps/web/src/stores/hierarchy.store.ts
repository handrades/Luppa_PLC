/**
 * Hierarchy Zustand Store
 * Manages state for site hierarchy operations
 * Story 4.5: Site Hierarchy Management
 */

import { create } from 'zustand';
import { createJSONStorage, devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
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

// Enable MapSet plugin for Immer to handle Sets
enableMapSet();

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
  };
  cellsPagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };

  // Cache management
  lastFetch: {
    sites: number;
    cells: number;
    tree: number;
    statistics: number;
  };
  cacheTimeout: number; // milliseconds
}

/**
 * Hierarchy store actions interface
 */
interface HierarchyActions {
  // Site operations
  fetchSites: (params?: {
    search?: string;
    includeEmpty?: boolean;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  fetchSiteById: (id: string) => Promise<SiteWithDetails>;
  createSite: (data: CreateSiteDto) => Promise<Site>;
  updateSite: (id: string, data: UpdateSiteDto) => Promise<Site>;
  deleteSite: (id: string) => Promise<void>;
  fetchSiteStatistics: (id: string) => Promise<SiteStatistics>;
  checkSiteInUse: (id: string) => Promise<boolean>;
  fetchSiteSuggestions: (query: string, limit?: number) => Promise<void>;
  validateSiteUniqueness: (name: string, excludeId?: string) => Promise<boolean>;

  // Cell operations
  fetchCells: (params?: {
    siteId?: string;
    search?: string;
    includeEmpty?: boolean;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  fetchCellById: (id: string) => Promise<CellWithDetails>;
  fetchCellsBySite: (siteId: string) => Promise<void>;
  createCell: (data: CreateCellDto) => Promise<Cell>;
  updateCell: (id: string, data: UpdateCellDto) => Promise<Cell>;
  deleteCell: (id: string) => Promise<void>;
  fetchCellStatistics: (id: string) => Promise<CellStatistics>;
  checkCellInUse: (id: string) => Promise<boolean>;
  fetchCellSuggestions: (siteId: string, query: string, limit?: number) => Promise<void>;
  validateCellUniqueness: (
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ) => Promise<boolean>;

  // Hierarchy tree operations
  fetchHierarchyTree: (params?: {
    expandLevel?: number;
    siteId?: string;
    cellId?: string;
    includeEmpty?: boolean;
    search?: string;
  }) => Promise<void>;
  fetchHierarchyStatistics: () => Promise<void>;
  validateHierarchy: (options?: {
    checkOrphans?: boolean;
    checkConstraints?: boolean;
    checkCounts?: boolean;
  }) => Promise<void>;
  detectOrphanedRecords: () => Promise<void>;

  // Bulk operations
  performBulkOperation: (operation: HierarchyBulkOperation) => Promise<HierarchyBulkResult>;

  // Export/Import operations
  exportHierarchy: (
    format: 'json' | 'csv' | 'xlsx',
    params?: {
      siteIds?: string[];
      includeEquipment?: boolean;
      includePlcs?: boolean;
    }
  ) => Promise<Blob>;
  importHierarchy: (
    file: File,
    options: {
      format: 'json' | 'csv' | 'xlsx';
      validateOnly?: boolean;
      skipDuplicates?: boolean;
    }
  ) => Promise<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    errors: Array<{ row: number; field: string; message: string }>;
  }>;

  // Tree state management
  toggleNodeExpansion: (nodeId: string) => void;
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  expandToLevel: (level: number) => void;

  // Filter and search management
  setFilters: (filters: Partial<HierarchyFilters>) => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;
  clearFilters: () => void;

  // Navigation and selection
  setSelectedSite: (siteId: string | null) => void;
  setSelectedCell: (cellId: string | null) => void;
  navigateToLocation: (location: HierarchyLocation) => void;

  // Utility actions
  clearError: () => void;
  clearCache: () => void;
  refreshData: () => Promise<void>;

  // Convenience methods for components
  getCellById: (id: string) => Promise<CellWithDetails>;
  getCellsBySite: (siteId: string) => Promise<void>;
  loadSites: (params?: {
    search?: string;
    includeEmpty?: boolean;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  loadCells: (params?: {
    siteId?: string;
    search?: string;
    includeEmpty?: boolean;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  loadHierarchyTree: (params?: {
    expandLevel?: number;
    siteId?: string;
    cellId?: string;
    includeEmpty?: boolean;
    search?: string;
  }) => Promise<void>;
  loadHierarchyStatistics: () => Promise<void>;
  validateCellLineNumber: (
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ) => Promise<boolean>;
  searchCellSuggestions: (siteId: string, query: string, limit?: number) => Promise<void>;

  // Preferences (stub for now)
  preferences: {
    savedFilters?: Array<{ name: string; filters: Partial<HierarchyFilters> }>;
  };
  saveFilterPreset: (name: string, filters: Partial<HierarchyFilters>) => Promise<void>;
  loadFilterPreset: (presetName: string) => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

/**
 * Complete hierarchy store type
 */
export type HierarchyStore = HierarchyState & HierarchyActions;

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
  selectedNodeIds: new Set<string>(),
  currentLocation: null,

  // Tree state
  expandedNodes: new Set<string>(),
  treeState: {
    nodes: [],
    expandedNodes: new Set<string>(),
    selectedNodes: new Set<string>(),
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
  },
  cellsPagination: {
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 0,
  },

  // Cache management
  lastFetch: {
    sites: 0,
    cells: 0,
    tree: 0,
    statistics: 0,
  },
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

/**
 * Hierarchy store instance
 */
export const useHierarchyStore = create<HierarchyStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Site operations
          fetchSites: async params => {
            set(state => {
              state.isLoadingSites = true;
              state.error = null;
            });

            try {
              const response = await hierarchyService.getSites(params);
              set(state => {
                state.sites = response.data;
                state.sitesPagination = {
                  page: response.pagination.page,
                  pageSize: response.pagination.pageSize,
                  totalItems: response.pagination.totalItems,
                  totalPages: response.pagination.totalPages,
                };
                state.lastFetch.sites = Date.now();
                state.isLoadingSites = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingSites = false;
              });
              throw error;
            }
          },

          fetchSiteById: async id => {
            set(state => {
              state.isLoadingSites = true;
              state.error = null;
            });

            try {
              const site = await hierarchyService.getSiteById(id);
              set(state => {
                state.isLoadingSites = false;
              });
              return site;
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingSites = false;
              });
              throw error;
            }
          },

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
                if (index !== -1) {
                  state.sites[index] = site;
                }
                state.isUpdatingSite = false;
              });
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
                state.isDeletingSite = false;
                if (state.selectedSiteId === id) {
                  state.selectedSiteId = null;
                }
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isDeletingSite = false;
              });
              throw error;
            }
          },

          fetchSiteStatistics: async id => {
            set(state => {
              state.isLoadingStatistics = true;
              state.error = null;
            });

            try {
              const statistics = await hierarchyService.getSiteStatistics(id);
              set(state => {
                state.siteStatistics[id] = statistics;
                state.isLoadingStatistics = false;
              });
              return statistics;
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingStatistics = false;
              });
              throw error;
            }
          },

          checkSiteInUse: async id => {
            try {
              return await hierarchyService.checkSiteInUse(id);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              throw error;
            }
          },

          fetchSiteSuggestions: async (query, limit = 10) => {
            try {
              const suggestions = await hierarchyService.getSiteSuggestions(query, limit);
              set(state => {
                state.siteSuggestions = suggestions;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.siteSuggestions = [];
              });
            }
          },

          validateSiteUniqueness: async (name, excludeId) => {
            try {
              return await hierarchyService.validateSiteUniqueness(name, excludeId);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              return false;
            }
          },

          // Cell operations
          fetchCells: async params => {
            set(state => {
              state.isLoadingCells = true;
              state.error = null;
            });

            try {
              const response = await hierarchyService.getCells(params);
              set(state => {
                state.cells = response.data;
                state.cellsPagination = {
                  page: response.pagination.page,
                  pageSize: response.pagination.pageSize,
                  totalItems: response.pagination.totalItems,
                  totalPages: response.pagination.totalPages,
                };
                state.lastFetch.cells = Date.now();
                state.isLoadingCells = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingCells = false;
              });
              throw error;
            }
          },

          fetchCellById: async id => {
            set(state => {
              state.isLoadingCells = true;
              state.error = null;
            });

            try {
              const cell = await hierarchyService.getCellById(id);
              set(state => {
                state.isLoadingCells = false;
              });
              return cell;
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingCells = false;
              });
              throw error;
            }
          },

          fetchCellsBySite: async siteId => {
            set(state => {
              state.isLoadingCells = true;
              state.error = null;
            });

            try {
              const cells = await hierarchyService.getCellsBySite(siteId);
              set(state => {
                state.cells = cells;
                state.isLoadingCells = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingCells = false;
              });
              throw error;
            }
          },

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
                if (index !== -1) {
                  state.cells[index] = cell;
                }
                state.isUpdatingCell = false;
              });
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
                state.isDeletingCell = false;
                if (state.selectedCellId === id) {
                  state.selectedCellId = null;
                }
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isDeletingCell = false;
              });
              throw error;
            }
          },

          fetchCellStatistics: async id => {
            set(state => {
              state.isLoadingStatistics = true;
              state.error = null;
            });

            try {
              const statistics = await hierarchyService.getCellStatistics(id);
              set(state => {
                state.cellStatistics[id] = statistics;
                state.isLoadingStatistics = false;
              });
              return statistics;
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingStatistics = false;
              });
              throw error;
            }
          },

          checkCellInUse: async id => {
            try {
              return await hierarchyService.checkCellInUse(id);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              throw error;
            }
          },

          fetchCellSuggestions: async (siteId, query, limit = 10) => {
            try {
              const suggestions = await hierarchyService.getCellSuggestions(siteId, query, limit);
              set(state => {
                state.cellSuggestions = suggestions;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.cellSuggestions = [];
              });
            }
          },

          validateCellUniqueness: async (siteId, lineNumber, excludeId) => {
            try {
              return await hierarchyService.validateCellUniqueness(siteId, lineNumber, excludeId);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              return false;
            }
          },

          // Hierarchy tree operations
          fetchHierarchyTree: async params => {
            set(state => {
              state.isLoadingTree = true;
              state.treeState.isLoading = true;
              state.treeState.error = null;
              state.error = null;
            });

            try {
              const response = await hierarchyService.getHierarchyTree(params);
              set(state => {
                state.hierarchyTree = response.tree;
                state.treeState.nodes = response.tree;
                state.treeState.isLoading = false;
                state.treeState.error = null;
                state.lastFetch.tree = Date.now();
                state.isLoadingTree = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.treeState.isLoading = false;
                state.treeState.error =
                  (error as HierarchyServiceError).message || 'Failed to load hierarchy tree';
                state.isLoadingTree = false;
              });
              throw error;
            }
          },

          fetchHierarchyStatistics: async () => {
            set(state => {
              state.isLoadingStatistics = true;
              state.error = null;
            });

            try {
              const statistics = await hierarchyService.getHierarchyStatistics();
              set(state => {
                state.hierarchyStatistics = statistics;
                state.lastFetch.statistics = Date.now();
                state.isLoadingStatistics = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isLoadingStatistics = false;
              });
              throw error;
            }
          },

          validateHierarchy: async options => {
            set(state => {
              state.isValidating = true;
              state.error = null;
            });

            try {
              const results = await hierarchyService.validateHierarchy(options);
              set(state => {
                state.validationResults = results;
                state.isValidating = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isValidating = false;
              });
              throw error;
            }
          },

          detectOrphanedRecords: async () => {
            set(state => {
              state.isValidating = true;
              state.error = null;
            });

            try {
              const orphans = await hierarchyService.detectOrphanedRecords();
              set(state => {
                state.orphanedRecords = orphans;
                state.isValidating = false;
              });
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isValidating = false;
              });
              throw error;
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

              // Refresh relevant data based on operation type
              if (operation.operation === 'delete') {
                await get().fetchSites();
                await get().fetchCells();
              }

              return result;
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
                state.isBulkOperating = false;
              });
              throw error;
            }
          },

          // Export/Import operations
          exportHierarchy: async (format, params) => {
            try {
              return await hierarchyService.exportHierarchy(format, params);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              throw error;
            }
          },

          importHierarchy: async (file, options) => {
            try {
              return await hierarchyService.importHierarchy(file, options);
            } catch (error) {
              set(state => {
                state.error = error as HierarchyServiceError;
              });
              throw error;
            }
          },

          // Tree state management
          toggleNodeExpansion: nodeId => {
            set(state => {
              if (state.expandedNodes.has(nodeId)) {
                state.expandedNodes.delete(nodeId);
              } else {
                state.expandedNodes.add(nodeId);
              }
            });
          },

          selectNode: (nodeId, multiSelect = false) => {
            set(state => {
              if (multiSelect) {
                if (state.selectedNodeIds.has(nodeId)) {
                  state.selectedNodeIds.delete(nodeId);
                } else {
                  state.selectedNodeIds.add(nodeId);
                }
              } else {
                state.selectedNodeIds.clear();
                state.selectedNodeIds.add(nodeId);
              }
            });
          },

          clearSelection: () => {
            set(state => {
              state.selectedNodeIds.clear();
              state.selectedSiteId = null;
              state.selectedCellId = null;
            });
          },

          expandAll: () => {
            set(state => {
              const collectNodeIds = (nodes: HierarchyNode[]): string[] => {
                return nodes.reduce((acc: string[], node) => {
                  acc.push(node.id);
                  if (node.children) {
                    acc.push(...collectNodeIds(node.children));
                  }
                  return acc;
                }, []);
              };

              const allNodeIds = collectNodeIds(state.hierarchyTree);
              state.expandedNodes = new Set(allNodeIds);
            });
          },

          collapseAll: () => {
            set(state => {
              state.expandedNodes.clear();
            });
          },

          expandToLevel: level => {
            set(state => {
              const collectNodeIdsToLevel = (
                nodes: HierarchyNode[],
                currentLevel: number,
                targetLevel: number
              ): string[] => {
                if (currentLevel >= targetLevel) return [];

                return nodes.reduce((acc: string[], node) => {
                  acc.push(node.id);
                  if (node.children) {
                    acc.push(
                      ...collectNodeIdsToLevel(node.children, currentLevel + 1, targetLevel)
                    );
                  }
                  return acc;
                }, []);
              };

              const nodeIds = collectNodeIdsToLevel(state.hierarchyTree, 0, level);
              state.expandedNodes = new Set(nodeIds);
            });
          },

          // Filter and search management
          setFilters: filters => {
            set(state => {
              state.filters = { ...state.filters, ...filters };
            });
          },

          setSearchQuery: query => {
            set(state => {
              state.searchQuery = query;
            });
          },

          applyFilters: () => {
            set(state => {
              state.appliedFilters = { ...state.filters };
            });
          },

          clearFilters: () => {
            set(state => {
              state.filters = {};
              state.appliedFilters = {};
              state.searchQuery = '';
            });
          },

          // Navigation and selection
          setSelectedSite: siteId => {
            set(state => {
              state.selectedSiteId = siteId;
              if (siteId) {
                const site = state.sites.find(s => s.id === siteId);
                if (site) {
                  state.currentLocation = {
                    site: {
                      id: site.id,
                      name: site.name,
                    },
                    cell: {
                      id: '',
                      name: '',
                      lineNumber: '',
                    },
                    path: site.name,
                  };
                }
              }
            });
          },

          setSelectedCell: cellId => {
            set(state => {
              state.selectedCellId = cellId;
              if (cellId) {
                const cell = state.cells.find(c => c.id === cellId);
                if (cell) {
                  const site = state.sites.find(s => s.id === cell.siteId);
                  state.currentLocation = {
                    site: {
                      id: cell.siteId,
                      name: site?.name || '',
                    },
                    cell: {
                      id: cell.id,
                      name: cell.name,
                      lineNumber: cell.lineNumber,
                    },
                    path: `${site?.name || ''} / ${cell.name}`,
                  };
                }
              }
            });
          },

          navigateToLocation: location => {
            set(state => {
              state.currentLocation = location;
              if (location.cell.id) {
                state.selectedSiteId = location.site.id;
                state.selectedCellId = location.cell.id;
              } else if (location.site.id) {
                state.selectedSiteId = location.site.id;
                state.selectedCellId = null;
              }
            });
          },

          // Utility actions
          clearError: () => {
            set(state => {
              state.error = null;
              state.siteErrors = {};
              state.cellErrors = {};
            });
          },

          clearCache: () => {
            set(state => {
              state.lastFetch = {
                sites: 0,
                cells: 0,
                tree: 0,
                statistics: 0,
              };
            });
          },

          refreshData: async () => {
            const state = get();
            const promises: Promise<void>[] = [];

            // Refresh sites if loaded
            if (state.sites.length > 0 || state.lastFetch.sites > 0) {
              promises.push(state.fetchSites());
            }

            // Refresh cells if loaded
            if (state.cells.length > 0 || state.lastFetch.cells > 0) {
              promises.push(state.fetchCells());
            }

            // Refresh tree if loaded
            if (state.hierarchyTree.length > 0 || state.lastFetch.tree > 0) {
              promises.push(state.fetchHierarchyTree());
            }

            // Refresh statistics if loaded
            if (state.hierarchyStatistics || state.lastFetch.statistics > 0) {
              promises.push(state.fetchHierarchyStatistics());
            }

            await Promise.all(promises);
          },

          // Convenience methods that map to existing actions
          getCellById: async (id: string) => get().fetchCellById(id),
          getCellsBySite: async (siteId: string) => get().fetchCellsBySite(siteId),
          loadSites: async (params?: {
            search?: string;
            includeEmpty?: boolean;
            page?: number;
            pageSize?: number;
          }) => get().fetchSites(params),
          loadCells: async (params?: {
            siteId?: string;
            search?: string;
            includeEmpty?: boolean;
            page?: number;
            pageSize?: number;
          }) => get().fetchCells(params),
          loadHierarchyTree: async (params?: {
            expandLevel?: number;
            siteId?: string;
            cellId?: string;
            includeEmpty?: boolean;
            search?: string;
          }) => get().fetchHierarchyTree(params),
          loadHierarchyStatistics: async () => get().fetchHierarchyStatistics(),
          validateCellLineNumber: async (siteId: string, lineNumber: string, excludeId?: string) =>
            get().validateCellUniqueness(siteId, lineNumber, excludeId),
          searchCellSuggestions: async (siteId: string, query: string, limit?: number) =>
            get().fetchCellSuggestions(siteId, query, limit),

          // Preferences stub
          preferences: {},
          saveFilterPreset: async (_name: string, _filters: Partial<HierarchyFilters>) => {
            /* TODO: Implement */
          },
          loadFilterPreset: async (_presetName: string) => {
            /* TODO: Implement */
          },
          hasUnsavedChanges: () => {
            const state = get();
            return (
              state.isCreatingSite ||
              state.isUpdatingSite ||
              state.isCreatingCell ||
              state.isUpdatingCell ||
              state.isBulkOperating
            );
          },
        }))
      ),
      {
        name: 'hierarchy-store',
        partialize: state => ({
          selectedSiteId: state.selectedSiteId,
          selectedCellId: state.selectedCellId,
          expandedNodes: state.expandedNodes,
          filters: state.filters,
          currentLocation: state.currentLocation,
        }),
        storage: createJSONStorage(() => localStorage, {
          replacer: (_key, value) => {
            // Serialize Sets as arrays
            if (value instanceof Set) {
              return Array.from(value);
            }
            return value;
          },
          reviver: (key, value) => {
            // Deserialize arrays back to Sets for specific keys
            if (key === 'expandedNodes' && Array.isArray(value)) {
              return new Set(value);
            }
            return value;
          },
        }),
      }
    ),
    {
      name: 'HierarchyStore',
    }
  )
);

// Helper selectors
export const selectSiteById = (id: string | null) => (state: HierarchyStore) =>
  id ? state.sites.find(site => site.id === id) : null;

export const selectCellById = (id: string | null) => (state: HierarchyStore) =>
  id ? state.cells.find(cell => cell.id === id) : null;

export const selectCellsBySite = (siteId: string | null) => (state: HierarchyStore) =>
  siteId ? state.cells.filter(cell => cell.siteId === siteId) : [];

export const selectIsNodeExpanded = (nodeId: string) => (state: HierarchyStore) =>
  state.expandedNodes.has(nodeId);

export const selectIsNodeSelected = (nodeId: string) => (state: HierarchyStore) =>
  state.selectedNodeIds.has(nodeId);

export const selectHasUnsavedChanges = (state: HierarchyStore) =>
  state.isCreatingSite ||
  state.isUpdatingSite ||
  state.isCreatingCell ||
  state.isUpdatingCell ||
  state.isBulkOperating;

// Export type for external usage
export type { HierarchyState, HierarchyActions };

// Export a hook for components that depend on currentLocation
export const useCurrentLocation = () => useHierarchyStore(state => state.currentLocation);

/**
 * Advanced Filter Store
 * Story 5.1: Advanced Filtering System
 *
 * Zustand store for managing advanced filter state, presets,
 * URL synchronization, and performance optimization.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { debounce } from 'lodash-es';

import type {
  AdvancedFilters,
  FilterHistoryEntry,
  FilterPerformanceMetrics,
  FilterPreset,
  FilterState,
  FilterValidation,
} from '../types/advanced-filters';
import { EquipmentType } from '../types/equipment';
import {
  areFiltersEqual,
  calculateFilterComplexity,
  sanitizeFilterInput,
  validateAdvancedFilters,
} from '../validation/filter.schemas';

/**
 * Filter store interface extending the base FilterState
 */
interface FilterStore extends FilterState {
  // Add missing properties from FilterState
  filterHistory: FilterHistoryEntry[];
  performanceMetrics: FilterPerformanceMetrics;
  // Actions for filter management
  setFilters: (filters: AdvancedFilters) => void;
  updateFilters: (updates: Partial<AdvancedFilters>) => void;
  clearFilters: () => void;
  removeFilter: (key: keyof AdvancedFilters) => void;
  applyFilters: () => Promise<void>;
  resetFilters: () => void;

  // Panel management actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleSection: (sectionId: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;

  // Preset management actions
  loadPresets: () => Promise<void>;
  createPreset: (name: string, description?: string) => Promise<FilterPreset>;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  applyPreset: (presetId: string) => void;
  setDefaultPreset: (presetId: string) => Promise<void>;

  // URL synchronization actions
  syncFromURL: () => void;
  syncToURL: () => void;
  generateShareLink: () => string;
  parseShareLink: (url: string) => boolean;

  // Performance and analytics actions
  recordFilterUsage: () => void;
  getPerformanceMetrics: () => FilterPerformanceMetrics;
  optimizeFilters: () => AdvancedFilters;

  // Validation actions
  validateCurrentFilters: () => FilterValidation;
  clearErrors: () => void;

  // History management
  addToHistory: (filters: AdvancedFilters, resultCount: number, executionTime: number) => void;
  clearHistory: () => void;
  getFilterFromHistory: (index: number) => AdvancedFilters | null;
}

/**
 * Initial filter state
 */
const initialFilters: AdvancedFilters = {
  page: 1,
  pageSize: 50,
  sortBy: 'name',
  sortOrder: 'asc',
};

/**
 * Default expanded sections for filter panel
 */
const defaultExpandedSections = ['presets'];

/**
 * Debounced filter application (300ms delay)
 */
let debouncedApplyFilters: ReturnType<typeof debounce> | null = null;

/**
 * Create the advanced filter store
 */
export const useFilterStore = create<FilterStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        panelOpen: false,
        expandedSections: defaultExpandedSections,
        filters: initialFilters,
        pendingFilters: {},
        presets: [],
        currentPresetId: null,
        isApplyingFilters: false,
        isLoadingPresets: false,
        error: null,

        // Performance and analytics (not persisted)
        filterHistory: [],
        performanceMetrics: {
          averageApplyTimeMs: 0,
          totalOperations: 0,
          cacheHitRate: 0,
          popularFilters: [],
          performanceAlerts: [],
        },

        // Filter management actions
        setFilters: filters => {
          set(state => {
            state.filters = sanitizeFilterInput(filters);
            state.pendingFilters = {};
            state.error = null;
          });
          get().syncToURL();
        },

        updateFilters: updates => {
          set(state => {
            const sanitizedUpdates = sanitizeFilterInput(updates);
            state.pendingFilters = {
              ...state.pendingFilters,
              ...sanitizedUpdates,
            };
          });

          // Initialize debounced function if not exists
          if (!debouncedApplyFilters) {
            debouncedApplyFilters = debounce(() => {
              const { pendingFilters } = get();
              if (Object.keys(pendingFilters).length > 0) {
                set(state => {
                  state.filters = { ...state.filters, ...pendingFilters };
                  state.pendingFilters = {};
                  state.error = null;
                });
                get().syncToURL();
              }
            }, 300);
          }

          debouncedApplyFilters();
        },

        removeFilter: (key: keyof AdvancedFilters) => {
          set(state => {
            // Remove the specific filter
            delete state.filters[key];
            state.pendingFilters[key] = undefined;
          });
          // Apply filters after removal
          get().applyFilters();
        },

        clearFilters: () => {
          set(state => {
            state.filters = initialFilters;
            state.pendingFilters = {};
            state.currentPresetId = null;
            state.error = null;
          });
          get().syncToURL();
        },

        applyFilters: async () => {
          set(state => {
            state.isApplyingFilters = true;
            state.error = null;
          });

          try {
            // const startTime = performance.now();
            const { filters, pendingFilters } = get();
            const finalFilters = { ...filters, ...pendingFilters };

            // Validate filters
            const validation = validateAdvancedFilters(finalFilters);
            if (!validation.success) {
              throw new Error('Invalid filter configuration');
            }

            // Apply filters immediately
            set(state => {
              state.filters = finalFilters;
              state.pendingFilters = {};
            });

            // Record performance metrics
            // const duration = performance.now() - startTime;
            get().recordFilterUsage();

            get().syncToURL();
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Unknown error occurred';
            });
          } finally {
            set(state => {
              state.isApplyingFilters = false;
            });
          }
        },

        resetFilters: () => {
          set(state => {
            state.filters = initialFilters;
            state.pendingFilters = {};
            state.currentPresetId = null;
            state.error = null;
            state.expandedSections = defaultExpandedSections;
          });
          get().syncToURL();
        },

        // Panel management actions
        togglePanel: () => {
          set(state => {
            state.panelOpen = !state.panelOpen;
          });
        },

        openPanel: () => {
          set(state => {
            state.panelOpen = true;
          });
        },

        closePanel: () => {
          set(state => {
            state.panelOpen = false;
          });
        },

        toggleSection: sectionId => {
          set(state => {
            const index = state.expandedSections.indexOf(sectionId);
            if (index >= 0) {
              state.expandedSections.splice(index, 1);
            } else {
              state.expandedSections.push(sectionId);
            }
          });
        },

        expandAllSections: () => {
          set(state => {
            state.expandedSections = ['presets', 'location', 'dates', 'network', 'tags'];
          });
        },

        collapseAllSections: () => {
          set(state => {
            state.expandedSections = [];
          });
        },

        // Preset management actions
        loadPresets: async () => {
          set(state => {
            state.isLoadingPresets = true;
            state.error = null;
          });

          try {
            // TODO: Replace with actual API call
            const mockPresets: FilterPreset[] = [
              {
                id: '1',
                name: 'Production Equipment',
                description: 'All production line equipment',
                filterConfig: {
                  equipmentTypes: [EquipmentType.PRESS, EquipmentType.ROBOT],
                  siteIds: ['site1', 'site2'],
                },
                isDefault: true,
                isShared: false,
                usageCount: 15,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-15'),
                createdBy: 'user1',
              },
            ];

            set(state => {
              state.presets = mockPresets;
            });
          } catch (error) {
            set(state => {
              state.error = error instanceof Error ? error.message : 'Failed to load presets';
            });
          } finally {
            set(state => {
              state.isLoadingPresets = false;
            });
          }
        },

        createPreset: async (name, description) => {
          const { filters } = get();

          const newPreset: FilterPreset = {
            id: `preset-${Date.now()}`,
            name,
            description,
            filterConfig: filters,
            isDefault: false,
            isShared: false,
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'current-user', // TODO: Get from auth store
          };

          set(state => {
            state.presets.push(newPreset);
          });

          return newPreset;
        },

        updatePreset: async (presetId, updates) => {
          set(state => {
            const preset = state.presets.find(p => p.id === presetId);
            if (preset) {
              Object.assign(preset, updates);
              preset.updatedAt = new Date();
            }
          });
        },

        deletePreset: async presetId => {
          set(state => {
            state.presets = state.presets.filter(p => p.id !== presetId);
            if (state.currentPresetId === presetId) {
              state.currentPresetId = null;
            }
          });
        },

        applyPreset: presetId => {
          const { presets } = get();
          const preset = presets.find(p => p.id === presetId);

          if (preset) {
            set(state => {
              state.filters = preset.filterConfig;
              state.pendingFilters = {};
              state.currentPresetId = presetId;
              state.error = null;

              // Increment usage count
              preset.usageCount += 1;
              preset.lastUsedAt = new Date();
            });

            get().syncToURL();
            get().recordFilterUsage();
          }
        },

        setDefaultPreset: async presetId => {
          set(state => {
            // Clear existing default
            state.presets.forEach(p => {
              p.isDefault = false;
            });

            // Set new default
            const preset = state.presets.find(p => p.id === presetId);
            if (preset) {
              preset.isDefault = true;
            }
          });
        },

        // URL synchronization actions
        syncFromURL: () => {
          const urlParams = new URLSearchParams(window.location.search);
          const filterData = urlParams.get('f');
          const presetId = urlParams.get('p');

          if (presetId) {
            get().applyPreset(presetId);
          } else if (filterData) {
            try {
              const decodedFilters = JSON.parse(atob(filterData));
              const validation = validateAdvancedFilters(decodedFilters);

              if (validation.success) {
                set(state => {
                  state.filters = validation.data!;
                  state.pendingFilters = {};
                  state.currentPresetId = null;
                  state.error = null;
                });
              }
            } catch {
              // Failed to parse filter data from URL - silently ignore and use defaults
            }
          }
        },

        syncToURL: () => {
          const { filters, currentPresetId } = get();
          const url = new URL(window.location.href);

          // Clear existing filter params
          url.searchParams.delete('f');
          url.searchParams.delete('p');

          if (currentPresetId) {
            url.searchParams.set('p', currentPresetId);
          } else if (!areFiltersEqual(filters, initialFilters)) {
            const filterData = btoa(JSON.stringify(filters));
            url.searchParams.set('f', filterData);
          }

          // Update URL without triggering page reload
          window.history.replaceState(null, '', url.toString());
        },

        generateShareLink: () => {
          const { filters, currentPresetId } = get();
          const url = new URL(window.location.origin + window.location.pathname);

          if (currentPresetId) {
            url.searchParams.set('p', currentPresetId);
          } else {
            const filterData = btoa(JSON.stringify(filters));
            url.searchParams.set('f', filterData);
          }

          return url.toString();
        },

        parseShareLink: url => {
          try {
            const urlObj = new URL(url);
            const filterData = urlObj.searchParams.get('f');
            const presetId = urlObj.searchParams.get('p');

            if (presetId) {
              get().applyPreset(presetId);
              return true;
            } else if (filterData) {
              const decodedFilters = JSON.parse(atob(filterData));
              const validation = validateAdvancedFilters(decodedFilters);

              if (validation.success) {
                get().setFilters(validation.data!);
                return true;
              }
            }

            return false;
          } catch {
            // Failed to parse share link - return false
            return false;
          }
        },

        // Performance and analytics actions
        recordFilterUsage: () => {
          const { filters } = get();
          calculateFilterComplexity(filters);

          set(state => {
            const entry: FilterHistoryEntry = {
              id: `history-${Date.now()}`,
              filters,
              appliedAt: new Date(),
              resultCount: 0, // TODO: Get from API response
              executionTimeMs: 0, // TODO: Measure actual execution time
              fromPreset: state.currentPresetId || undefined,
            };

            state.filterHistory.unshift(entry);

            // Keep only last 50 entries
            if (state.filterHistory.length > 50) {
              state.filterHistory = state.filterHistory.slice(0, 50);
            }

            // Update performance metrics
            state.performanceMetrics.totalOperations += 1;
          });
        },

        getPerformanceMetrics: () => {
          return get().performanceMetrics;
        },

        optimizeFilters: () => {
          const { filters } = get();
          // TODO: Implement filter optimization logic
          return filters;
        },

        // Validation actions
        validateCurrentFilters: (): FilterValidation => {
          const { filters, pendingFilters } = get();
          const finalFilters = { ...filters, ...pendingFilters };
          const validation = validateAdvancedFilters(finalFilters);

          if (validation.success) {
            return {
              isValid: true,
              fieldErrors: {},
              warnings: validation.warnings || [],
              performanceWarnings: [],
            };
          } else {
            // Convert array errors to string errors
            const fieldErrors: Record<string, string> = {};
            if (validation.fieldErrors) {
              for (const [key, value] of Object.entries(validation.fieldErrors)) {
                fieldErrors[key] = Array.isArray(value) ? value[0] : value || 'Validation error';
              }
            }

            return {
              isValid: false,
              fieldErrors,
              warnings: [],
              performanceWarnings: [],
            };
          }
        },

        clearErrors: () => {
          set(state => {
            state.error = null;
          });
        },

        // History management
        addToHistory: (filters, resultCount, executionTime) => {
          set(state => {
            const entry: FilterHistoryEntry = {
              id: `history-${Date.now()}`,
              filters,
              appliedAt: new Date(),
              resultCount,
              executionTimeMs: executionTime,
            };

            state.filterHistory.unshift(entry);

            // Keep only last 50 entries
            if (state.filterHistory.length > 50) {
              state.filterHistory = state.filterHistory.slice(0, 50);
            }
          });
        },

        clearHistory: () => {
          set(state => {
            state.filterHistory = [];
          });
        },

        getFilterFromHistory: index => {
          const { filterHistory } = get();
          return filterHistory[index]?.filters || null;
        },
      })),
      {
        name: 'advanced-filter-store',
        // Only persist certain state properties
        partialize: state => ({
          expandedSections: state.expandedSections,
          presets: state.presets,
          // Don't persist current filters or panel state
        }),
      }
    ),
    {
      name: 'advanced-filter-store',
    }
  )
);

// Initialize URL synchronization on page load
if (typeof window !== 'undefined') {
  // Sync from URL on initial load
  setTimeout(() => {
    useFilterStore.getState().syncFromURL();
  }, 100);

  // Handle browser back/forward navigation
  window.addEventListener('popstate', () => {
    useFilterStore.getState().syncFromURL();
  });
}

// Export selector hooks for optimized access
export const useFilterPanelOpen = () => useFilterStore(state => state.panelOpen);
export const useFilters = () => useFilterStore(state => state.filters);
export const usePendingFilters = () => useFilterStore(state => state.pendingFilters);
export const useFilterPresets = () => useFilterStore(state => state.presets);
export const useCurrentPreset = () => {
  const currentPresetId = useFilterStore(state => state.currentPresetId);
  const presets = useFilterStore(state => state.presets);
  return presets.find(p => p.id === currentPresetId) || null;
};
export const useFilterValidation = () => {
  const validateCurrentFilters = useFilterStore(state => state.validateCurrentFilters);
  return validateCurrentFilters();
};

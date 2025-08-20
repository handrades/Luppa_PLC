/**
 * Search Store
 * Zustand store for managing search state and operations
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  RecentSearch,
  SearchMetrics,
  SearchPreset,
  SearchQuery,
  SearchResponse,
  SearchResultItem,
} from '../types/search';
import { searchService } from '../services/search.service';
import { logger } from '../utils/logger';

interface SearchStore {
  // Search state
  query: string;
  results: SearchResultItem[];
  loading: boolean;
  error: string | null;

  // Pagination state
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;

  // Search metadata
  executionTime: number;
  searchType: 'fulltext' | 'similarity' | 'hybrid' | null;

  // History and suggestions
  recentSearches: RecentSearch[];
  suggestions: string[];
  suggestionsLoading: boolean;

  // Search presets
  presets: SearchPreset[];
  activePreset: string | null;

  // Performance tracking
  metrics: SearchMetrics | null;

  // UI state
  showAdvancedOptions: boolean;
  includeHighlights: boolean;

  // Actions
  setQuery: (query: string) => void;
  executeSearch: (query: string, options?: Partial<SearchQuery>) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  clearResults: () => void;
  clearError: () => void;

  // History management
  addToHistory: (query: string, resultCount?: number, executionTime?: number) => void;
  clearHistory: () => void;
  removeFromHistory: (index: number) => void;

  // Suggestions
  getSuggestions: (partialQuery: string, limit?: number) => Promise<void>;
  clearSuggestions: () => void;

  // Presets
  savePreset: (name: string, description: string, query: SearchQuery) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  setActivePreset: (presetId: string | null) => void;

  // Settings
  setPageSize: (size: number) => void;
  setIncludeHighlights: (include: boolean) => void;
  toggleAdvancedOptions: () => void;

  // Metrics
  loadMetrics: () => Promise<void>;

  // Reset
  reset: () => void;
}

const INITIAL_STATE = {
  query: '',
  results: [],
  loading: false,
  error: null,
  currentPage: 1,
  pageSize: 50,
  totalResults: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
  executionTime: 0,
  searchType: null,
  recentSearches: [],
  suggestions: [],
  suggestionsLoading: false,
  presets: [],
  activePreset: null,
  metrics: null,
  showAdvancedOptions: false,
  includeHighlights: true,
};

export const useSearchStore = create<SearchStore>()(
  persist(
    immer((set, get) => ({
      ...INITIAL_STATE,

      setQuery: (query: string) => {
        set(state => {
          state.query = query;
          if (!query.trim()) {
            state.results = [];
            state.error = null;
            state.totalResults = 0;
          }
        });
      },

      executeSearch: async (query: string, options = {}) => {
        const state = get();

        if (!query.trim()) {
          set(state => {
            state.results = [];
            state.totalResults = 0;
            state.error = null;
          });
          return;
        }

        set(state => {
          state.loading = true;
          state.error = null;
          state.query = query.trim();
          if (options.page === 1 || !options.page) {
            state.results = [];
            state.currentPage = 1;
          }
        });

        try {
          const searchQuery: SearchQuery = {
            q: query.trim(),
            page: options.page || state.currentPage,
            pageSize: options.pageSize || state.pageSize,
            includeHighlights: options.includeHighlights ?? state.includeHighlights,
            sortBy: options.sortBy || 'relevance',
            sortOrder: options.sortOrder || 'DESC',
            maxResults: options.maxResults || 1000,
            ...options,
          };

          const response: SearchResponse = await searchService.search(searchQuery);

          set(state => {
            if (searchQuery.page === 1) {
              state.results = response.data;
            } else {
              state.results.push(...response.data);
            }

            state.currentPage = response.pagination.page;
            state.pageSize = response.pagination.pageSize;
            state.totalResults = response.pagination.total;
            state.totalPages = response.pagination.totalPages;
            state.hasNext = response.pagination.hasNext;
            state.hasPrev = response.pagination.hasPrev;

            state.executionTime = response.searchMetadata.executionTimeMs;
            state.searchType = response.searchMetadata.searchType;

            state.loading = false;
          });

          // Add to search history
          get().addToHistory(
            query.trim(),
            response.pagination.total,
            response.searchMetadata.executionTimeMs
          );

          // Log search metrics
          logger.info('Search executed', {
            query: query.trim(),
            resultCount: response.pagination.total,
            executionTime: response.searchMetadata.executionTimeMs,
            searchType: response.searchMetadata.searchType,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Search failed';

          set(state => {
            state.loading = false;
            state.error = errorMessage;
            state.results = [];
            state.totalResults = 0;
          });

          logger.error('Search failed', {
            query: query.trim(),
            error: errorMessage,
          });
        }
      },

      loadMoreResults: async () => {
        const state = get();

        if (!state.hasNext || state.loading || !state.query) {
          return;
        }

        await get().executeSearch(state.query, {
          page: state.currentPage + 1,
          pageSize: state.pageSize,
        });
      },

      clearResults: () => {
        set(state => {
          state.results = [];
          state.totalResults = 0;
          state.totalPages = 0;
          state.currentPage = 1;
          state.hasNext = false;
          state.hasPrev = false;
          state.error = null;
          state.executionTime = 0;
          state.searchType = null;
        });
      },

      clearError: () => {
        set(state => {
          state.error = null;
        });
      },

      addToHistory: (query: string, resultCount = 0, executionTime = 0) => {
        set(state => {
          const trimmedQuery = query.trim();
          if (!trimmedQuery) return;

          // Remove existing entry if it exists
          state.recentSearches = state.recentSearches.filter(
            search => search.query !== trimmedQuery
          );

          // Add new entry at the beginning
          state.recentSearches.unshift({
            query: trimmedQuery,
            timestamp: new Date(),
            resultCount,
            executionTime,
          });

          // Keep only last 10 searches
          state.recentSearches = state.recentSearches.slice(0, 10);
        });
      },

      clearHistory: () => {
        set(state => {
          state.recentSearches = [];
        });
      },

      removeFromHistory: (index: number) => {
        set(state => {
          state.recentSearches.splice(index, 1);
        });
      },

      getSuggestions: async (partialQuery: string, limit = 10) => {
        const trimmedQuery = partialQuery.trim();

        if (!trimmedQuery || trimmedQuery.length < 2) {
          set(state => {
            state.suggestions = [];
          });
          return;
        }

        set(state => {
          state.suggestionsLoading = true;
        });

        try {
          const response = await searchService.getSuggestions(trimmedQuery, limit);

          set(state => {
            state.suggestions = response.suggestions;
            state.suggestionsLoading = false;
          });
        } catch (error) {
          set(state => {
            state.suggestions = [];
            state.suggestionsLoading = false;
          });

          logger.warn('Failed to get search suggestions', {
            query: trimmedQuery,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      clearSuggestions: () => {
        set(state => {
          state.suggestions = [];
          state.suggestionsLoading = false;
        });
      },

      savePreset: (name: string, description: string, query: SearchQuery) => {
        set(state => {
          const preset: SearchPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            query,
            isDefault: false,
            createdAt: new Date(),
          };

          state.presets.push(preset);
        });
      },

      loadPreset: (presetId: string) => {
        const state = get();
        const preset = state.presets.find(p => p.id === presetId);

        if (preset) {
          set(state => {
            state.activePreset = presetId;
            state.query = preset.query.q;
            state.pageSize = preset.query.pageSize || 50;
            state.includeHighlights = preset.query.includeHighlights ?? true;

            // Update last used timestamp
            const presetIndex = state.presets.findIndex(p => p.id === presetId);
            if (presetIndex !== -1) {
              state.presets[presetIndex].lastUsed = new Date();
            }
          });

          // Execute the preset search
          get().executeSearch(preset.query.q, preset.query);
        }
      },

      deletePreset: (presetId: string) => {
        set(state => {
          state.presets = state.presets.filter(p => p.id !== presetId);
          if (state.activePreset === presetId) {
            state.activePreset = null;
          }
        });
      },

      setActivePreset: (presetId: string | null) => {
        set(state => {
          state.activePreset = presetId;
        });
      },

      setPageSize: (size: number) => {
        set(state => {
          state.pageSize = Math.max(1, Math.min(100, size));
        });
      },

      setIncludeHighlights: (include: boolean) => {
        set(state => {
          state.includeHighlights = include;
        });
      },

      toggleAdvancedOptions: () => {
        set(state => {
          state.showAdvancedOptions = !state.showAdvancedOptions;
        });
      },

      loadMetrics: async () => {
        try {
          const metrics = await searchService.getMetrics();

          set(state => {
            state.metrics = metrics;
          });
        } catch (error) {
          logger.warn('Failed to load search metrics', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      reset: () => {
        set(state => {
          Object.assign(state, INITIAL_STATE);
        });
      },
    })),
    {
      name: 'search-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist certain parts of the state
        recentSearches: state.recentSearches,
        presets: state.presets,
        pageSize: state.pageSize,
        includeHighlights: state.includeHighlights,
        showAdvancedOptions: state.showAdvancedOptions,
      }),
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // Handle migrations if needed
        if (version < 1) {
          // Migration logic for older versions
          const state = persistedState as Record<string, unknown>;
          return {
            ...state,
            recentSearches: state.recentSearches || [],
            presets: state.presets || [],
          };
        }
        return persistedState;
      },
    }
  )
);

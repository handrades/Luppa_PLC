/**
 * useSearch Hook
 * 
 * Provides a convenient interface for search functionality with
 * debouncing, error handling, and performance tracking.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchStore } from '../stores/search.store';
import { useDebounce } from './useDebounce';
import { SearchQuery } from '../types/search';

interface UseSearchOptions {
  autoSearch?: boolean;
  debounceDelay?: number;
  defaultPageSize?: number;
  includeHighlights?: boolean;
}

interface UseSearchReturn {
  // State
  query: string;
  results: any[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  executionTime: number;
  
  // Actions
  setQuery: (query: string) => void;
  search: (query?: string, options?: Partial<SearchQuery>) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
  
  // Computed values
  hasResults: boolean;
  hasMore: boolean;
  isSearching: boolean;
}

/**
 * useSearch Hook
 * 
 * @param options - Configuration options for the search hook
 * @returns Search state and actions
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    autoSearch = false,
    debounceDelay = 300,
    defaultPageSize = 50,
    includeHighlights = true,
  } = options;

  // Store selectors
  const {
    query,
    results,
    loading,
    error,
    totalResults,
    executionTime,
    hasNext,
    setQuery: setStoreQuery,
    executeSearch,
    loadMoreResults,
    clearResults,
    clearError,
    setPageSize,
    setIncludeHighlights,
  } = useSearchStore();

  // Debounced query for auto-search
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Initialize settings
  useEffect(() => {
    setPageSize(defaultPageSize);
    setIncludeHighlights(includeHighlights);
  }, [defaultPageSize, includeHighlights, setPageSize, setIncludeHighlights]);

  // Auto-search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery.trim() && debouncedQuery !== query) {
      executeSearch(debouncedQuery);
    }
  }, [autoSearch, debouncedQuery, executeSearch, query]);

  // Memoized actions
  const setQuery = useCallback((newQuery: string) => {
    setStoreQuery(newQuery);
  }, [setStoreQuery]);

  const search = useCallback(async (searchQuery?: string, searchOptions?: Partial<SearchQuery>) => {
    const queryToUse = searchQuery ?? query;
    if (!queryToUse.trim()) {
      clearResults();
      return;
    }
    
    await executeSearch(queryToUse, {
      page: 1,
      pageSize: defaultPageSize,
      includeHighlights,
      ...searchOptions,
    });
  }, [query, executeSearch, clearResults, defaultPageSize, includeHighlights]);

  const loadMore = useCallback(async () => {
    if (hasNext && !loading) {
      await loadMoreResults();
    }
  }, [hasNext, loading, loadMoreResults]);

  // Computed values
  const computed = useMemo(() => ({
    hasResults: results.length > 0,
    hasMore: hasNext,
    isSearching: loading,
  }), [results.length, hasNext, loading]);

  return {
    // State
    query,
    results,
    loading,
    error,
    totalResults,
    executionTime,
    
    // Actions
    setQuery,
    search,
    loadMore,
    clearResults,
    clearError,
    
    // Computed values
    ...computed,
  };
}

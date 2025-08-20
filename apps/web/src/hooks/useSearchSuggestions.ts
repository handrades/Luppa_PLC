/**
 * useSearchSuggestions Hook
 * 
 * Manages search suggestions with intelligent caching and filtering
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchStore } from '../stores/search.store';
import { useDebounce } from './useDebounce';

interface UseSearchSuggestionsOptions {
  debounceDelay?: number;
  maxSuggestions?: number;
  minQueryLength?: number;
  includeRecent?: boolean;
  autoFetch?: boolean;
}

interface UseSearchSuggestionsReturn {
  // State
  suggestions: string[];
  loading: boolean;
  query: string;
  
  // Recent searches
  recentSearches: Array<{ query: string; timestamp: Date }>;
  
  // Actions
  getSuggestions: (query: string, limit?: number) => Promise<void>;
  clearSuggestions: () => void;
  selectSuggestion: (suggestion: string) => void;
  
  // Computed
  allSuggestions: Array<{ label: string; type: 'recent' | 'suggestion' }>;
  hasSuggestions: boolean;
}

/**
 * useSearchSuggestions Hook
 * 
 * @param options - Configuration options for suggestions
 * @returns Suggestions state and actions
 */
export function useSearchSuggestions(
  options: UseSearchSuggestionsOptions = {}
): UseSearchSuggestionsReturn {
  const {
    debounceDelay = 300,
    maxSuggestions = 10,
    minQueryLength = 2,
    includeRecent = true,
    autoFetch = true,
  } = options;

  // Store selectors
  const {
    query,
    suggestions,
    suggestionsLoading,
    recentSearches,
    getSuggestions: fetchSuggestions,
    clearSuggestions,
    setQuery,
    executeSearch,
  } = useSearchStore();

  // Debounced query for auto-fetching
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Auto-fetch suggestions when debounced query changes
  useEffect(() => {
    if (
      autoFetch &&
      debouncedQuery.trim().length >= minQueryLength &&
      debouncedQuery !== query
    ) {
      fetchSuggestions(debouncedQuery, maxSuggestions);
    } else if (debouncedQuery.trim().length < minQueryLength) {
      clearSuggestions();
    }
  }, [
    autoFetch,
    debouncedQuery,
    minQueryLength,
    maxSuggestions,
    fetchSuggestions,
    clearSuggestions,
    query,
  ]);

  // Memoized actions
  const getSuggestions = useCallback(
    async (searchQuery: string, limit = maxSuggestions) => {
      if (searchQuery.trim().length >= minQueryLength) {
        await fetchSuggestions(searchQuery, limit);
      }
    },
    [fetchSuggestions, maxSuggestions, minQueryLength]
  );

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      executeSearch(suggestion);
      clearSuggestions();
    },
    [setQuery, executeSearch, clearSuggestions]
  );

  // Combine suggestions with recent searches
  const allSuggestions = useMemo(() => {
    const combined: Array<{ label: string; type: 'recent' | 'suggestion' }> = [];
    
    if (includeRecent && query.trim().length === 0) {
      // Show recent searches when query is empty
      const recentItems = recentSearches
        .slice(0, Math.max(5, maxSuggestions / 2))
        .map(search => ({
          label: search.query,
          type: 'recent' as const,
        }));
      combined.push(...recentItems);
    } else if (includeRecent && query.trim().length > 0) {
      // Show matching recent searches
      const matchingRecent = recentSearches
        .filter(search =>
          search.query.toLowerCase().includes(query.toLowerCase()) &&
          search.query !== query
        )
        .slice(0, 3)
        .map(search => ({
          label: search.query,
          type: 'recent' as const,
        }));
      combined.push(...matchingRecent);
    }

    // Add AI-generated suggestions
    const remainingSlots = maxSuggestions - combined.length;
    const filteredSuggestions = suggestions
      .filter(suggestion => 
        !combined.some(item => item.label === suggestion) &&
        suggestion !== query
      )
      .slice(0, remainingSlots)
      .map(suggestion => ({
        label: suggestion,
        type: 'suggestion' as const,
      }));

    combined.push(...filteredSuggestions);

    return combined;
  }, [
    includeRecent,
    query,
    recentSearches,
    suggestions,
    maxSuggestions,
  ]);

  const hasSuggestions = useMemo(() => {
    return allSuggestions.length > 0;
  }, [allSuggestions.length]);

  return {
    // State
    suggestions,
    loading: suggestionsLoading,
    query,
    
    // Recent searches
    recentSearches,
    
    // Actions
    getSuggestions,
    clearSuggestions,
    selectSuggestion,
    
    // Computed
    allSuggestions,
    hasSuggestions,
  };
}

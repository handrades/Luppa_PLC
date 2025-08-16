/**
 * useEquipmentSearch Hook for Search Functionality
 * Story 4.3: Equipment List UI
 *
 * Custom hook for equipment search with debouncing and search state management
 * Provides optimized search experience with 300ms debounce delay
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEquipmentStore } from '../stores/equipment.store';
import type { UseEquipmentSearchReturn } from '../types/equipment';

/**
 * Custom hook for equipment search functionality
 *
 * @param initialSearchTerm - Initial search term
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Search state and utility functions
 */
export function useEquipmentSearch(
  initialSearchTerm = '',
  debounceMs = 300
): UseEquipmentSearchReturn {
  // Local search input state (immediate updates for UI)
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  // Debounced search term state (triggers actual search)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);

  // Get search state and actions from store
  const isSearching = useEquipmentStore(state => state.isSearching);
  const currentFilters = useEquipmentStore(state => state.filters);
  const searchEquipment = useEquipmentStore(state => state.searchEquipment);
  const setFilters = useEquipmentStore(state => state.setFilters);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== currentFilters.search) {
      if (debouncedSearchTerm.trim()) {
        searchEquipment(debouncedSearchTerm.trim());
      } else {
        // Clear search - fetch equipment without search filter
        const filtersWithoutSearch = { ...currentFilters };
        delete filtersWithoutSearch.search;
        setFilters(filtersWithoutSearch);
      }
    }
    // ESLint disable is intentional - Zustand actions are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, currentFilters.search]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    // debouncedSearchTerm will be updated by the debounce effect
  }, []);

  // Set search term function
  const handleSetSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm: handleSetSearchTerm,
      debouncedSearchTerm,
      isSearching,
      clearSearch,
    }),
    [searchTerm, handleSetSearchTerm, debouncedSearchTerm, isSearching, clearSearch]
  );
}

/**
 * Hook for advanced search functionality with multiple filters
 *
 * @param debounceMs - Debounce delay in milliseconds
 * @returns Advanced search state and utility functions
 */
export function useAdvancedEquipmentSearch(debounceMs = 300) {
  // Individual filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [siteName, setSiteName] = useState('');
  const [cellName, setCellName] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');

  // Debounced states
  const [debouncedFilters, setDebouncedFilters] = useState({
    search: '',
    siteName: '',
    cellName: '',
    equipmentType: '',
    make: '',
    model: '',
  });

  // Store actions
  const setFilters = useEquipmentStore(state => state.setFilters);
  const isSearching = useEquipmentStore(state => state.isSearching);

  // Debounce all filters together
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        search: searchTerm,
        siteName,
        cellName,
        equipmentType,
        make,
        model,
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, siteName, cellName, equipmentType, make, model, debounceMs]);

  // Apply filters when debounced values change
  useEffect(() => {
    const activeFilters = Object.entries(debouncedFilters).reduce(
      (acc, [key, value]) => {
        if (value.trim()) {
          acc[key as keyof typeof debouncedFilters] = value.trim();
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Reset to first page when filters change
    setFilters({ ...activeFilters, page: 1 });
  }, [debouncedFilters, setFilters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSiteName('');
    setCellName('');
    setEquipmentType('');
    setMake('');
    setModel('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(debouncedFilters).some(value => value.trim() !== '');
  }, [debouncedFilters]);

  return {
    // Filter states
    searchTerm,
    siteName,
    cellName,
    equipmentType,
    make,
    model,

    // Filter setters
    setSearchTerm,
    setSiteName,
    setCellName,
    setEquipmentType,
    setMake,
    setModel,

    // Debounced states
    debouncedFilters,

    // UI state
    isSearching,
    hasActiveFilters,

    // Utility functions
    clearAllFilters,
  };
}

/**
 * Hook for search suggestions and autocomplete
 *
 * @param searchTerm - Current search term
 * @param enabled - Whether suggestions should be fetched
 * @returns Search suggestions data
 */
export function useEquipmentSearchSuggestions(searchTerm: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounce search term for suggestions
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 150); // Shorter debounce for suggestions

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch suggestions when debounced term changes
  useEffect(() => {
    // Derive trimmed term at the top of the effect
    const trimmed = debouncedTerm.trim();

    if (!enabled || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Mock implementation - in real app, this would call an API
    const mockSuggestions = [
      'Allen-Bradley ControlLogix',
      'Siemens S7-1500',
      'Schneider Modicon',
      'Omron CJ2M',
      'Mitsubishi FX3U',
    ].filter(suggestion => suggestion.toLowerCase().includes(trimmed.toLowerCase()));

    // Simulate API delay
    const timer = setTimeout(() => {
      setSuggestions(mockSuggestions);
      setIsLoading(false);
    }, 100);

    return () => {
      clearTimeout(timer);
      setIsLoading(false);
    };
  }, [debouncedTerm, enabled]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    clearSuggestions,
  };
}

/**
 * Hook for search history management
 *
 * @param maxHistory - Maximum number of search terms to remember
 * @returns Search history state and utility functions
 */
export function useEquipmentSearchHistory(maxHistory = 10) {
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    // Load from localStorage on initialization
    try {
      const saved = localStorage.getItem('equipmentSearchHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Add search term to history
  const addToHistory = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) return;

      setSearchHistory(prevHistory => {
        const trimmedTerm = searchTerm.trim();
        const filteredHistory = prevHistory.filter(term => term !== trimmedTerm);
        const newHistory = [trimmedTerm, ...filteredHistory].slice(0, maxHistory);

        // Save to localStorage
        try {
          localStorage.setItem('equipmentSearchHistory', JSON.stringify(newHistory));
        } catch {
          // Handle localStorage errors silently
        }

        return newHistory;
      });
    },
    [maxHistory]
  );

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('equipmentSearchHistory');
    } catch {
      // Handle localStorage errors silently
    }
  }, []);

  // Remove specific term from history
  const removeFromHistory = useCallback((searchTerm: string) => {
    setSearchHistory(prevHistory => {
      const newHistory = prevHistory.filter(term => term !== searchTerm);
      try {
        localStorage.setItem('equipmentSearchHistory', JSON.stringify(newHistory));
      } catch {
        // Handle localStorage errors silently
      }
      return newHistory;
    });
  }, []);

  return {
    searchHistory,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}

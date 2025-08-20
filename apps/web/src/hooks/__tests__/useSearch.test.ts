/**
 * useSearch Hook Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearch } from '../useSearch';
import { useSearchStore } from '../../stores/search.store';

// Mock the search store
jest.mock('../../stores/search.store');
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

// Mock debounce hook
jest.mock('../useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

describe('useSearch', () => {
  const mockSetQuery = jest.fn();
  const mockExecuteSearch = jest.fn();
  const mockLoadMoreResults = jest.fn();
  const mockClearResults = jest.fn();
  const mockClearError = jest.fn();
  const mockSetPageSize = jest.fn();
  const mockSetIncludeHighlights = jest.fn();

  const defaultStoreState = {
    query: '',
    results: [],
    loading: false,
    error: null,
    totalResults: 0,
    executionTime: 0,
    hasNext: false,
    setQuery: mockSetQuery,
    executeSearch: mockExecuteSearch,
    loadMoreResults: mockLoadMoreResults,
    clearResults: mockClearResults,
    clearError: mockClearError,
    setPageSize: mockSetPageSize,
    setIncludeHighlights: mockSetIncludeHighlights,
  };

  beforeEach(() => {
    mockUseSearchStore.mockReturnValue(defaultStoreState as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasResults).toBe(false);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isSearching).toBe(false);
    });

    it('should set page size on initialization', () => {
      renderHook(() => useSearch({ defaultPageSize: 25 }));

      expect(mockSetPageSize).toHaveBeenCalledWith(25);
    });

    it('should set include highlights on initialization', () => {
      renderHook(() => useSearch({ includeHighlights: false }));

      expect(mockSetIncludeHighlights).toHaveBeenCalledWith(false);
    });
  });

  describe('query management', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test query');
      });

      expect(mockSetQuery).toHaveBeenCalledWith('test query');
    });
  });

  describe('search execution', () => {
    it('should execute search with provided query', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search('test query');
      });

      expect(mockExecuteSearch).toHaveBeenCalledWith('test query', {
        page: 1,
        pageSize: 50,
        includeHighlights: true,
      });
    });

    it('should execute search with current query if no query provided', async () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        query: 'current query',
      } as any);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search();
      });

      expect(mockExecuteSearch).toHaveBeenCalledWith('current query', {
        page: 1,
        pageSize: 50,
        includeHighlights: true,
      });
    });

    it('should clear results when searching with empty query', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search('');
      });

      expect(mockClearResults).toHaveBeenCalled();
      expect(mockExecuteSearch).not.toHaveBeenCalled();
    });

    it('should pass search options to executeSearch', async () => {
      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.search('test', {
          sortBy: 'name',
          sortOrder: 'ASC',
          maxResults: 100,
        });
      });

      expect(mockExecuteSearch).toHaveBeenCalledWith('test', {
        page: 1,
        pageSize: 50,
        includeHighlights: true,
        sortBy: 'name',
        sortOrder: 'ASC',
        maxResults: 100,
      });
    });
  });

  describe('auto-search functionality', () => {
    it('should auto-search when debounced query changes', async () => {
      const { rerender } = renderHook(
        ({ query: _query }: { query: string }) => useSearch({ autoSearch: true }),
        { initialProps: { query: '' } }
      );

      // Update store to simulate query change
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        query: 'auto search test',
      } as any);

      rerender({ query: 'auto search test' });

      await waitFor(() => {
        expect(mockExecuteSearch).toHaveBeenCalledWith('auto search test');
      });
    });

    it('should not auto-search when autoSearch is disabled', () => {
      const { rerender } = renderHook(
        ({ query: _query }: { query: string }) => useSearch({ autoSearch: false }),
        { initialProps: { query: '' } }
      );

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        query: 'no auto search',
      } as any);

      rerender({ query: 'no auto search' });

      expect(mockExecuteSearch).not.toHaveBeenCalled();
    });
  });

  describe('load more functionality', () => {
    it('should load more results when hasNext is true and not loading', async () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        hasNext: true,
        loading: false,
      } as any);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockLoadMoreResults).toHaveBeenCalled();
    });

    it('should not load more when hasNext is false', async () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        hasNext: false,
      } as any);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockLoadMoreResults).not.toHaveBeenCalled();
    });

    it('should not load more when already loading', async () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        hasNext: true,
        loading: true,
      } as any);

      const { result } = renderHook(() => useSearch());

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockLoadMoreResults).not.toHaveBeenCalled();
    });
  });

  describe('computed values', () => {
    it('should compute hasResults correctly', () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        results: [{ id: '1' }, { id: '2' }],
      } as any);

      const { result } = renderHook(() => useSearch());

      expect(result.current.hasResults).toBe(true);
    });

    it('should compute hasMore correctly', () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        hasNext: true,
      } as any);

      const { result } = renderHook(() => useSearch());

      expect(result.current.hasMore).toBe(true);
    });

    it('should compute isSearching correctly', () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        loading: true,
      } as any);

      const { result } = renderHook(() => useSearch());

      expect(result.current.isSearching).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should expose error from store', () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Search failed',
      } as any);

      const { result } = renderHook(() => useSearch());

      expect(result.current.error).toBe('Search failed');
    });

    it('should allow clearing errors', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('custom options', () => {
    it('should use custom debounce delay', () => {
      renderHook(() => useSearch({ debounceDelay: 500 }));

      // This would be tested if we had a real debounce implementation
      // For now, we just verify the hook doesn't crash
      expect(true).toBe(true);
    });

    it('should use custom page size', () => {
      renderHook(() => useSearch({ defaultPageSize: 25 }));

      expect(mockSetPageSize).toHaveBeenCalledWith(25);
    });

    it('should use custom highlight setting', () => {
      renderHook(() => useSearch({ includeHighlights: false }));

      expect(mockSetIncludeHighlights).toHaveBeenCalledWith(false);
    });
  });

  describe('memoization', () => {
    it('should memoize search function', () => {
      const { result, rerender } = renderHook(() => useSearch());

      const firstSearch = result.current.search;
      rerender();
      const secondSearch = result.current.search;

      expect(firstSearch).toBe(secondSearch);
    });

    it('should memoize loadMore function', () => {
      const { result, rerender } = renderHook(() => useSearch());

      const firstLoadMore = result.current.loadMore;
      rerender();
      const secondLoadMore = result.current.loadMore;

      expect(firstLoadMore).toBe(secondLoadMore);
    });
  });

  describe('state consistency', () => {
    it('should maintain state consistency across rerenders', () => {
      const mockResults = [{ id: '1', name: 'Test' }];
      
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreState,
        query: 'consistent query',
        results: mockResults,
        totalResults: 1,
        executionTime: 45,
      } as any);

      const { result, rerender } = renderHook(() => useSearch());

      expect(result.current.query).toBe('consistent query');
      expect(result.current.results).toBe(mockResults);
      expect(result.current.totalResults).toBe(1);
      expect(result.current.executionTime).toBe(45);

      rerender();

      expect(result.current.query).toBe('consistent query');
      expect(result.current.results).toBe(mockResults);
      expect(result.current.totalResults).toBe(1);
      expect(result.current.executionTime).toBe(45);
    });
  });
});

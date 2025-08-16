/**
 * useEquipmentSearch Hook Tests
 * Story 4.3: Equipment List UI
 */

import { renderHook, act } from '@testing-library/react';
import { useEquipmentSearch } from '../useEquipmentSearch';
import { useEquipmentStore } from '../../stores/equipment.store';

// Mock the equipment store
jest.mock('../../stores/equipment.store', () => ({
  useEquipmentStore: jest.fn(),
}));

const mockedUseEquipmentStore = useEquipmentStore as jest.MockedFunction<
  typeof useEquipmentStore
>;

describe('useEquipmentSearch', () => {
  const mockSearchEquipment = jest.fn();
  const mockSetFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock the store selectors and actions
    mockedUseEquipmentStore.mockImplementation((selector: any) => {
      const mockState = {
        isSearching: false,
        filters: { search: '' },
        searchEquipment: mockSearchEquipment,
        setFilters: mockSetFilters,
        fetchEquipment: jest.fn(),
      };

      return selector(mockState);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should initialize with empty search term', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      expect(result.current.searchTerm).toBe('');
      expect(result.current.debouncedSearchTerm).toBe('');
      expect(result.current.isSearching).toBe(false);
    });

    it('should initialize with provided search term', () => {
      const { result } = renderHook(() => useEquipmentSearch('initial term'));

      expect(result.current.searchTerm).toBe('initial term');
      expect(result.current.debouncedSearchTerm).toBe('initial term');
    });

    it('should update search term immediately', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('new search');
      });

      expect(result.current.searchTerm).toBe('new search');
      // Debounced term should not update immediately
      expect(result.current.debouncedSearchTerm).toBe('');
    });
  });

  describe('debouncing', () => {
    it('should debounce search term updates', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('test');
      });

      expect(result.current.debouncedSearchTerm).toBe('');

      // Fast forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearchTerm).toBe('test');
    });

    it('should use custom debounce delay', () => {
      const { result } = renderHook(() => useEquipmentSearch('', 500));

      act(() => {
        result.current.setSearchTerm('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearchTerm).toBe('');

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.debouncedSearchTerm).toBe('test');
    });

    it('should cancel previous debounce on rapid typing', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('te');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.setSearchTerm('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearchTerm).toBe('test');
    });
  });

  describe('search triggering', () => {
    beforeEach(() => {
      // Mock store to return empty search initially
      mockedUseEquipmentStore.mockImplementation((selector: any) => {
        const mockState = {
          isSearching: false,
          filters: { search: '' },
          searchEquipment: mockSearchEquipment,
          setFilters: mockSetFilters,
          fetchEquipment: jest.fn(),
        };
        return selector(mockState);
      });
    });

    it('should trigger search when debounced term changes', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('test search');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearchEquipment).toHaveBeenCalledWith('test search');
    });

    it('should trim search term before searching', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('  test search  ');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearchEquipment).toHaveBeenCalledWith('test search');
    });

    it('should clear search when empty term is provided', () => {
      const { result } = renderHook(() => useEquipmentSearch());

      // First set a search term
      act(() => {
        result.current.setSearchTerm('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Then clear it
      act(() => {
        result.current.setSearchTerm('');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSetFilters).toHaveBeenCalledWith({});
    });

    it('should not trigger search if term matches current filter', () => {
      // Mock store to return existing search
      mockedUseEquipmentStore.mockImplementation((selector: any) => {
        const mockState = {
          isSearching: false,
          filters: { search: 'existing' },
          searchEquipment: mockSearchEquipment,
          setFilters: mockSetFilters,
          fetchEquipment: jest.fn(),
        };
        return selector(mockState);
      });

      const { result } = renderHook(() => useEquipmentSearch());

      act(() => {
        result.current.setSearchTerm('existing');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearchEquipment).not.toHaveBeenCalled();
    });
  });

  describe('clear search', () => {
    it('should clear search term', () => {
      const { result } = renderHook(() => useEquipmentSearch('initial'));

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchTerm).toBe('');
    });

    it('should trigger debounce when clearing', () => {
      const { result } = renderHook(() => useEquipmentSearch('initial'));

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchTerm).toBe('');
      expect(result.current.debouncedSearchTerm).toBe('initial');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.debouncedSearchTerm).toBe('');
    });
  });

  describe('return value stability', () => {
    it('should maintain function reference stability', () => {
      const { result, rerender } = renderHook(() => useEquipmentSearch());

      const initialSetSearchTerm = result.current.setSearchTerm;
      const initialClearSearch = result.current.clearSearch;

      rerender();

      expect(result.current.setSearchTerm).toBe(initialSetSearchTerm);
      expect(result.current.clearSearch).toBe(initialClearSearch);
    });

    it('should memoize return object to prevent unnecessary re-renders', () => {
      const { result, rerender } = renderHook(() => useEquipmentSearch());

      const initialResult = result.current;

      rerender();

      // Only searchTerm and debouncedSearchTerm should potentially change
      expect(result.current.setSearchTerm).toBe(initialResult.setSearchTerm);
      expect(result.current.clearSearch).toBe(initialResult.clearSearch);
      expect(result.current.isSearching).toBe(initialResult.isSearching);
    });
  });
});

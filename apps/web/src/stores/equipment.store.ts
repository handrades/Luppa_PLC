/**
 * Equipment Zustand Store for State Management
 * Story 4.3: Equipment List UI
 *
 * Manages equipment list state, pagination, filters, selection, and loading states
 * Follows established Zustand patterns from the frontend architecture
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { equipmentService } from '../services/equipment.service';
import type {
  EquipmentSearchFilters,
  EquipmentSelectionState,
  EquipmentStore,
  PaginationMetadata,
} from '../types/equipment';

// Initial state values
const initialPagination: PaginationMetadata = {
  page: 1,
  pageSize: 50,
  totalItems: 0,
  totalPages: 0,
};

const initialSelection: EquipmentSelectionState = {
  selectedIds: new Set<string>(),
  isAllSelected: false,
  selectedCount: 0,
};

const initialFilters: EquipmentSearchFilters = {
  page: 1,
  limit: 50,
  sortBy: 'name',
  sortOrder: 'asc',
};

/**
 * Equipment Store Implementation
 * Provides centralized state management for equipment list functionality
 */
export const useEquipmentStore = create<EquipmentStore>()(
  devtools(
    (set, get) => ({
      // State
      equipment: [],
      pagination: initialPagination,
      filters: initialFilters,
      isLoading: false,
      isSearching: false,
      error: null,
      selection: initialSelection,

      // Actions
      fetchEquipment: async (filters?: EquipmentSearchFilters) => {
        const currentState = get();
        const mergedFilters = { ...currentState.filters, ...filters };

        set({ isLoading: true, error: null, filters: mergedFilters });

        try {
          const response = await equipmentService.getEquipment(mergedFilters);

          set({
            equipment: response.data,
            pagination: response.pagination,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Check if it's a 404 error (endpoint not implemented yet)
          // The error is already processed by equipment service and has status property
          const is404Error =
            error &&
            typeof error === 'object' &&
            'status' in error &&
            (error as { status: number }).status === 404;

          if (is404Error) {
            // Treat 404 as "no data" rather than an error to show empty state
            set({
              equipment: [],
              pagination: initialPagination,
              isLoading: false,
              error: null,
            });
          } else {
            // Handle other errors normally
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to fetch equipment';
            set({
              equipment: [],
              pagination: initialPagination,
              isLoading: false,
              error: errorMessage,
            });
          }
        }
      },

      searchEquipment: async (searchTerm: string) => {
        const currentState = get();
        const searchFilters = {
          ...currentState.filters,
          search: searchTerm,
          page: 1, // Reset to first page on new search
        };

        set({ isSearching: true, error: null, filters: searchFilters });

        try {
          const response = await equipmentService.searchEquipment(searchTerm, searchFilters);

          set({
            equipment: response.data,
            pagination: response.pagination,
            isSearching: false,
            error: null,
          });
        } catch (error) {
          // Check if it's a 404 error (endpoint not implemented yet)
          // The error is already processed by equipment service and has status property
          const is404Error =
            error &&
            typeof error === 'object' &&
            'status' in error &&
            (error as { status: number }).status === 404;

          if (is404Error) {
            // Treat 404 as "no data" rather than an error to show empty state
            set({
              equipment: [],
              pagination: initialPagination,
              isSearching: false,
              error: null,
            });
          } else {
            // Handle other errors normally
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to search equipment';
            set({
              equipment: [],
              pagination: initialPagination,
              isSearching: false,
              error: errorMessage,
            });
          }
        }
      },

      setFilters: async (newFilters: Partial<EquipmentSearchFilters>) => {
        const currentState = get();
        const updatedFilters = { ...currentState.filters, ...newFilters };

        set({ filters: updatedFilters });

        // Auto-fetch with new filters
        await get().fetchEquipment(updatedFilters);
      },

      setSelection: (selectedIds: Set<string>) => {
        const currentState = get();
        const equipmentIds = new Set(currentState.equipment.map(eq => eq.id));

        // Ensure all selected IDs exist in current equipment list
        const validSelectedIds = new Set(
          Array.from(selectedIds).filter(id => equipmentIds.has(id))
        );

        const isAllSelected =
          validSelectedIds.size === currentState.equipment.length &&
          currentState.equipment.length > 0;

        set({
          selection: {
            selectedIds: validSelectedIds,
            isAllSelected,
            selectedCount: validSelectedIds.size,
          },
        });
      },

      selectAll: () => {
        const currentState = get();
        const allIds = new Set(currentState.equipment.map(eq => eq.id));

        set({
          selection: {
            selectedIds: allIds,
            isAllSelected: true,
            selectedCount: allIds.size,
          },
        });
      },

      clearSelection: () => {
        set({
          selection: initialSelection,
        });
      },

      deleteEquipment: async (ids: string[]) => {
        if (ids.length === 0) return;

        set({ isLoading: true, error: null });

        try {
          await equipmentService.deleteMultipleEquipment(ids);

          const currentState = get();

          // Remove deleted items from the current equipment list
          const updatedEquipment = currentState.equipment.filter(
            equipment => !ids.includes(equipment.id)
          );

          // Clear selection and update equipment list
          set({
            equipment: updatedEquipment,
            isLoading: false,
            error: null,
            selection: initialSelection,
            pagination: {
              ...currentState.pagination,
              totalItems: Math.max(0, currentState.pagination.totalItems - ids.length),
            },
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to delete equipment';

          set({
            isLoading: false,
            error: errorMessage,
          });

          throw error; // Re-throw for component error handling
        }
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          equipment: [],
          pagination: initialPagination,
          filters: initialFilters,
          isLoading: false,
          isSearching: false,
          error: null,
          selection: initialSelection,
        });
      },
    }),
    {
      name: 'equipment-store',
      // Only include serializable state in devtools
      partialize: (state: EquipmentStore) => ({
        equipment: state.equipment,
        pagination: state.pagination,
        filters: state.filters,
        isLoading: state.isLoading,
        isSearching: state.isSearching,
        error: state.error,
        selection: {
          ...state.selection,
          selectedIds: Array.from(state.selection.selectedIds), // Convert Set to Array for serialization
        },
      }),
    }
  )
);

/**
 * Selector hooks for optimized component subscriptions
 * These help prevent unnecessary re-renders by allowing components
 * to subscribe only to specific parts of the store
 */

// Equipment data selectors
export const useEquipmentData = () => useEquipmentStore(state => state.equipment);
export const useEquipmentPagination = () => useEquipmentStore(state => state.pagination);
export const useEquipmentFilters = () => useEquipmentStore(state => state.filters);

// Loading state selectors
export const useEquipmentLoading = () => useEquipmentStore(state => state.isLoading);
export const useEquipmentSearching = () => useEquipmentStore(state => state.isSearching);
export const useEquipmentError = () => useEquipmentStore(state => state.error);

// Selection state selectors
export const useEquipmentSelection = () => useEquipmentStore(state => state.selection);
export const useSelectedEquipmentIds = () =>
  useEquipmentStore(state => state.selection.selectedIds);
export const useSelectedEquipmentCount = () =>
  useEquipmentStore(state => state.selection.selectedCount);
export const useIsAllEquipmentSelected = () =>
  useEquipmentStore(state => state.selection.isAllSelected);

// Action selectors - individual selectors for stability
export const useFetchEquipment = () => useEquipmentStore(state => state.fetchEquipment);
export const useSearchEquipment = () => useEquipmentStore(state => state.searchEquipment);
export const useSetFilters = () => useEquipmentStore(state => state.setFilters);
export const useSetSelection = () => useEquipmentStore(state => state.setSelection);
export const useSelectAll = () => useEquipmentStore(state => state.selectAll);
export const useClearSelection = () => useEquipmentStore(state => state.clearSelection);
export const useDeleteEquipment = () => useEquipmentStore(state => state.deleteEquipment);
export const useClearError = () => useEquipmentStore(state => state.clearError);
export const useResetEquipment = () => useEquipmentStore(state => state.reset);

// Legacy combined action selector (deprecated - use individual selectors above)
export const useEquipmentActions = () =>
  useEquipmentStore(state => ({
    fetchEquipment: state.fetchEquipment,
    searchEquipment: state.searchEquipment,
    setFilters: state.setFilters,
    setSelection: state.setSelection,
    selectAll: state.selectAll,
    clearSelection: state.clearSelection,
    deleteEquipment: state.deleteEquipment,
    clearError: state.clearError,
    reset: state.reset,
  }));

// Computed selectors
export const useHasEquipmentData = () => useEquipmentStore(state => state.equipment.length > 0);
export const useHasEquipmentError = () => useEquipmentStore(state => !!state.error);
export const useHasActiveFilters = () =>
  useEquipmentStore(state => {
    const filters = state.filters;
    return !!(
      filters.search ||
      filters.siteName ||
      filters.cellName ||
      filters.equipmentType ||
      filters.make ||
      filters.model
    );
  });

export const useHasNextPage = () =>
  useEquipmentStore(state => state.pagination.page < state.pagination.totalPages);

export const useHasPreviousPage = () => useEquipmentStore(state => state.pagination.page > 1);

/**
 * Helper function to get current store state
 * Useful for debugging and testing
 */
export const getEquipmentStoreState = () => useEquipmentStore.getState();

/**
 * Helper function to reset store to initial state
 * Useful for testing and cleanup
 */
export const resetEquipmentStore = () => useEquipmentStore.getState().reset();

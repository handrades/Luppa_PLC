/**
 * useEquipment Hook for Equipment Data Operations
 * Story 4.3: Equipment List UI
 *
 * Custom hook for equipment data fetching with React Query integration
 * Provides caching, background updates, and error handling
 */

import { useCallback, useEffect } from 'react';
import { useEquipmentStore } from '../stores/equipment.store';
import type { EquipmentSearchFilters, UseEquipmentReturn } from '../types/equipment';

/**
 * Hook for equipment data fetching using Zustand store
 *
 * @param initialFilters - Initial filters to apply
 * @param enabled - Whether the query should be enabled
 * @returns Equipment data, loading state, and utility functions
 */
export function useEquipment(
  initialFilters?: EquipmentSearchFilters,
  enabled = true
): UseEquipmentReturn {
  // Get store state and actions
  const equipment = useEquipmentStore(state => state.equipment);
  const pagination = useEquipmentStore(state => state.pagination);
  const isLoading = useEquipmentStore(state => state.isLoading);
  const error = useEquipmentStore(state => state.error);
  const fetchEquipment = useEquipmentStore(state => state.fetchEquipment);
  const setFilters = useEquipmentStore(state => state.setFilters);

  // Initialize with filters if provided
  useEffect(() => {
    if (enabled && initialFilters) {
      setFilters(initialFilters);
    }
    // ESLint disable is intentional - setFilters from Zustand is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters, enabled]);

  // Utility functions
  const refetchEquipment = useCallback(async () => {
    await fetchEquipment();
    // ESLint disable is intentional - fetchEquipment from Zustand is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMore = useCallback(async () => {
    if (pagination.page < pagination.totalPages) {
      await setFilters({ page: pagination.page + 1 });
    }
    // ESLint disable is intentional - setFilters from Zustand is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.totalPages]);

  const hasNextPage = pagination.page < pagination.totalPages;

  return {
    equipment,
    pagination,
    isLoading,
    error,
    refetch: refetchEquipment,
    fetchMore,
    hasNextPage,
  };
}

/**
 * Hook for equipment detail fetching (simplified for store-only approach)
 *
 * @param equipmentId - ID of equipment to fetch
 * @param enabled - Whether the query should be enabled
 * @returns Equipment detail data and loading state
 */
export function useEquipmentDetail(_equipmentId: string, _enabled = true) {
  // This would be implemented when needed for detail pages
  // For now, return placeholder implementation
  return {
    equipment: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
}

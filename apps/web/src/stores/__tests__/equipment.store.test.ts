/**
 * Equipment Store Tests
 * Story 4.3: Equipment List UI
 */

import { act, renderHook } from '@testing-library/react';
import { resetEquipmentStore, useEquipmentStore } from '../equipment.store';
import { equipmentService } from '../../services/equipment.service';
import type {
  EquipmentListResponse,
  EquipmentType,
  EquipmentWithDetails,
} from '../../types/equipment';

// Mock equipment service
jest.mock('../../services/equipment.service', () => ({
  equipmentService: {
    getEquipment: jest.fn(),
    searchEquipment: jest.fn(),
  },
}));

const mockedService = equipmentService as jest.Mocked<typeof equipmentService>;

describe('useEquipmentStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEquipmentStore();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEquipmentStore());

      expect(result.current.equipment).toEqual([]);
      expect(result.current.pagination).toEqual({
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.selection.selectedIds).toEqual(new Set());
      expect(result.current.selection.selectedCount).toBe(0);
    });
  });

  describe('fetchEquipment', () => {
    const mockResponse: EquipmentListResponse = {
      data: [
        {
          id: '1',
          cellId: 'cell-1',
          name: 'Test Equipment',
          equipmentType: 'PRESS' as EquipmentType,
          createdBy: 'user-1',
          updatedBy: 'user-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          siteName: 'Test Site',
          cellName: 'Test Cell',
          cellType: 'Assembly',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
    };

    it('should fetch equipment successfully', async () => {
      mockedService.getEquipment.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipment();
      });

      expect(result.current.equipment).toEqual(mockResponse.data);
      expect(result.current.pagination).toEqual(mockResponse.pagination);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle loading state', async () => {
      // Create a promise we can control
      let resolvePromise: (value: EquipmentListResponse) => void;
      const promise = new Promise<EquipmentListResponse>(resolve => {
        resolvePromise = resolve;
      });
      mockedService.getEquipment.mockReturnValue(promise);

      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.fetchEquipment();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockResponse);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockedService.getEquipment.mockRejectedValue(error);

      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipment();
      });

      expect(result.current.equipment).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });

    it('should merge filters correctly', async () => {
      mockedService.getEquipment.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEquipmentStore());

      // Set initial filters
      act(() => {
        result.current.setFilters({ siteName: 'Site A' });
      });

      await act(async () => {
        await result.current.fetchEquipment({ search: 'test' });
      });

      expect(mockedService.getEquipment).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        siteName: 'Site A',
        search: 'test',
      });
    });
  });

  describe('searchEquipment', () => {
    it('should search equipment and reset to first page', async () => {
      const mockResponse: EquipmentListResponse = {
        data: [],
        pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
      };
      mockedService.searchEquipment.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEquipmentStore());

      // Set page to 3 initially
      act(() => {
        result.current.setFilters({ page: 3 });
      });

      await act(async () => {
        await result.current.searchEquipment('test search');
      });

      expect(result.current.filters.page).toBe(1);
      expect(result.current.filters.search).toBe('test search');
      expect(mockedService.searchEquipment).toHaveBeenCalledWith('test search', {
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
        search: 'test search',
      });
    });
  });

  describe('setSelection', () => {
    const mockEquipment = [
      { id: '1', name: 'Equipment 1' } as EquipmentWithDetails,
      { id: '2', name: 'Equipment 2' } as EquipmentWithDetails,
      { id: '3', name: 'Equipment 3' } as EquipmentWithDetails,
    ];

    it('should set selection correctly', () => {
      const { result } = renderHook(() => useEquipmentStore());

      // Add some equipment first
      act(() => {
        result.current.equipment = mockEquipment;
      });

      act(() => {
        result.current.setSelection(new Set(['1', '2']));
      });

      expect(result.current.selection.selectedIds).toEqual(new Set(['1', '2']));
      expect(result.current.selection.selectedCount).toBe(2);
      expect(result.current.selection.isAllSelected).toBe(false);
    });

    it('should mark all as selected when all items are selected', () => {
      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.equipment = mockEquipment;
      });

      act(() => {
        result.current.setSelection(new Set(['1', '2', '3']));
      });

      expect(result.current.selection.isAllSelected).toBe(true);
    });

    it('should filter out invalid IDs', () => {
      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.equipment = mockEquipment;
      });

      act(() => {
        result.current.setSelection(new Set(['1', '999', '2']));
      });

      expect(result.current.selection.selectedIds).toEqual(new Set(['1', '2']));
      expect(result.current.selection.selectedCount).toBe(2);
    });
  });

  describe('selectAll', () => {
    it('should select all equipment', () => {
      const mockEquipment = [
        { id: '1', name: 'Equipment 1' } as EquipmentWithDetails,
        { id: '2', name: 'Equipment 2' } as EquipmentWithDetails,
      ];

      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.equipment = mockEquipment;
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selection.selectedIds).toEqual(new Set(['1', '2']));
      expect(result.current.selection.isAllSelected).toBe(true);
      expect(result.current.selection.selectedCount).toBe(2);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useEquipmentStore());

      // Set some selection first
      act(() => {
        result.current.setSelection(new Set(['1', '2']));
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selection.selectedIds).toEqual(new Set());
      expect(result.current.selection.selectedCount).toBe(0);
      expect(result.current.selection.isAllSelected).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('should update filters and trigger fetch', async () => {
      const mockResponse: EquipmentListResponse = {
        data: [],
        pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
      };
      mockedService.getEquipment.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        result.current.setFilters({ siteName: 'New Site', page: 2 });
      });

      expect(result.current.filters.siteName).toBe('New Site');
      expect(result.current.filters.page).toBe(2);
      expect(mockedService.getEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          siteName: 'New Site',
          page: 2,
        })
      );
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useEquipmentStore());

      // Set error first by calling a fetch that fails
      act(() => {
        // Simulate error state by calling fetchEquipment with a mocked failure
        const mockError = new Error('Test error');
        mockedService.getEquipment.mockRejectedValueOnce(mockError);
        result.current.fetchEquipment();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', async () => {
      const { result } = renderHook(() => useEquipmentStore());

      // Modify state through proper actions
      const mockResponse: EquipmentListResponse = {
        data: [{ id: '1' } as EquipmentWithDetails],
        pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      };

      mockedService.getEquipment.mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.fetchEquipment();
        result.current.setSelection(new Set(['1']));
      });

      // Verify state has data
      expect(result.current.equipment).toHaveLength(1);
      expect(result.current.selection.selectedIds.has('1')).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.equipment).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.selection.selectedIds).toEqual(new Set());
    });
  });
});

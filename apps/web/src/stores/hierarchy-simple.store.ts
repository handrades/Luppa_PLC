/**
 * Simplified Hierarchy Zustand Store
 * Basic state management without immer for quick fix
 * Story 4.5: Site Hierarchy Management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { hierarchyService } from '../services/hierarchy.service';
import { Cell, CellSuggestion, HierarchyServiceError, Site } from '../types/hierarchy';

interface HierarchyStore {
  // State
  sites: Site[];
  cells: Cell[];
  cellSuggestions: CellSuggestion[];
  isLoadingSites: boolean;
  isLoadingCells: boolean;
  isCreatingSite: boolean;
  isCreatingCell: boolean;
  error: HierarchyServiceError | null;

  // Actions
  loadSites: () => Promise<void>;
  loadCells: () => Promise<void>;
  getCellsBySite: (siteId: string) => Promise<void>;
  searchCellSuggestions: (siteId: string, query: string) => Promise<void>;
  createSite: (data: { name: string }) => Promise<Site>;
  createCell: (data: { siteId: string; name: string; lineNumber: string }) => Promise<Cell>;
  validateCellLineNumber: (
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ) => Promise<boolean>;
  clearError: () => void;
}

export const useHierarchyStore = create<HierarchyStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      sites: [],
      cells: [],
      cellSuggestions: [],
      isLoadingSites: false,
      isLoadingCells: false,
      isCreatingSite: false,
      isCreatingCell: false,
      error: null,

      // Actions
      loadSites: async () => {
        set({ isLoadingSites: true, error: null });
        try {
          const response = await hierarchyService.getSites();
          set({ sites: response.data, isLoadingSites: false });
        } catch (error) {
          set({
            error: error as HierarchyServiceError,
            isLoadingSites: false,
          });
        }
      },

      loadCells: async () => {
        set({ isLoadingCells: true, error: null });
        try {
          const response = await hierarchyService.getCells();
          set({ cells: response.data, isLoadingCells: false });
        } catch (error) {
          set({
            error: error as HierarchyServiceError,
            isLoadingCells: false,
          });
        }
      },

      getCellsBySite: async (siteId: string) => {
        set({ isLoadingCells: true, error: null });
        try {
          const response = await hierarchyService.getCells({ siteId });
          set({ cells: response.data, isLoadingCells: false });
        } catch (error) {
          set({
            error: error as HierarchyServiceError,
            isLoadingCells: false,
          });
        }
      },

      searchCellSuggestions: async (siteId: string, query: string) => {
        try {
          const suggestions = await hierarchyService.getCellSuggestions(siteId, query);
          set({ cellSuggestions: suggestions });
        } catch (error) {
          set({ error: error as HierarchyServiceError });
        }
      },

      createSite: async data => {
        set({ isCreatingSite: true, error: null });
        try {
          const newSite = await hierarchyService.createSite(data);
          const currentSites = get().sites;
          set({
            sites: [...currentSites, newSite],
            isCreatingSite: false,
          });
          return newSite;
        } catch (error) {
          set({
            error: error as HierarchyServiceError,
            isCreatingSite: false,
          });
          throw error;
        }
      },

      createCell: async data => {
        set({ isCreatingCell: true, error: null });
        try {
          const newCell = await hierarchyService.createCell(data);
          const currentCells = get().cells;
          set({
            cells: [...currentCells, newCell],
            isCreatingCell: false,
          });
          return newCell;
        } catch (error) {
          set({
            error: error as HierarchyServiceError,
            isCreatingCell: false,
          });
          throw error;
        }
      },

      validateCellLineNumber: async (siteId: string, lineNumber: string, excludeId?: string) => {
        try {
          return await hierarchyService.validateCellUniqueness(siteId, lineNumber, excludeId);
        } catch (error) {
          set({ error: error as HierarchyServiceError });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'hierarchy-store',
    }
  )
);

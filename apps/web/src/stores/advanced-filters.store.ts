/**
 * Advanced filters store using Zustand
 * Story 5.1: Advanced Filtering System
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AdvancedFilters,
  FilterPreset,
  FilterState,
  // FilterValidation,
} from '../types/advanced-filters';

interface AdvancedFiltersStore extends FilterState {
  // Additional store-specific properties
  defaultFilters: AdvancedFilters;
  isLoading: boolean;
  updateFilters: (filters: Partial<AdvancedFilters>) => void;
  resetFilters: () => void;
  // Actions
  setFilters: (filters: Partial<AdvancedFilters>) => void;
  setPendingFilters: (filters: Partial<AdvancedFilters>) => void;
  clearFilters: () => void;
  togglePanel: () => void;
  setExpandedSections: (sections: string[]) => void;
  toggleSection: (section: string) => void;
  setPresets: (presets: FilterPreset[]) => void;
  setCurrentPreset: (presetId: string | null) => void;
  setIsApplyingFilters: (isApplying: boolean) => void;
  setIsLoadingPresets: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialFilters: AdvancedFilters = {
  siteIds: [],
  cellTypes: [],
  equipmentTypes: [],
  makes: [],
  models: [],
  searchQuery: '',
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const initialState: FilterState = {
  panelOpen: false,
  expandedSections: ['basic', 'sites'],
  filters: initialFilters,
  pendingFilters: {},
  presets: [],
  currentPresetId: null,
  isApplyingFilters: false,
  isLoadingPresets: false,
  error: null,
};

const storeInitialState = {
  ...initialState,
  defaultFilters: initialFilters,
  isLoading: false,
};

export const useAdvancedFiltersStore = create<AdvancedFiltersStore>()(
  devtools(
    (set /* , get */) => ({
      ...storeInitialState,

      updateFilters: newFilters =>
        set(
          state => ({
            filters: { ...state.filters, ...newFilters },
            pendingFilters: {},
          }),
          false,
          'updateFilters'
        ),

      resetFilters: () =>
        set(
          {
            filters: storeInitialState.defaultFilters,
            pendingFilters: {},
            currentPresetId: null,
          },
          false,
          'resetFilters'
        ),

      setFilters: newFilters =>
        set(
          state => ({
            filters: { ...state.filters, ...newFilters },
            pendingFilters: {},
          }),
          false,
          'setFilters'
        ),

      setPendingFilters: newPendingFilters =>
        set(
          state => ({
            pendingFilters: { ...state.pendingFilters, ...newPendingFilters },
          }),
          false,
          'setPendingFilters'
        ),

      clearFilters: () =>
        set(
          {
            filters: initialFilters,
            pendingFilters: {},
            currentPresetId: null,
          },
          false,
          'clearFilters'
        ),

      togglePanel: () => set(state => ({ panelOpen: !state.panelOpen }), false, 'togglePanel'),

      setExpandedSections: sections =>
        set({ expandedSections: sections }, false, 'setExpandedSections'),

      toggleSection: section =>
        set(
          state => ({
            expandedSections: state.expandedSections.includes(section)
              ? state.expandedSections.filter(s => s !== section)
              : [...state.expandedSections, section],
          }),
          false,
          'toggleSection'
        ),

      setPresets: presets => set({ presets }, false, 'setPresets'),

      setCurrentPreset: presetId => set({ currentPresetId: presetId }, false, 'setCurrentPreset'),

      setIsApplyingFilters: isApplying =>
        set({ isApplyingFilters: isApplying }, false, 'setIsApplyingFilters'),

      setIsLoadingPresets: isLoading =>
        set({ isLoadingPresets: isLoading }, false, 'setIsLoadingPresets'),

      setError: error => set({ error }, false, 'setError'),
    }),
    {
      name: 'advanced-filters-store',
    }
  )
);

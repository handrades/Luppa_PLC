/**
 * Import/Export Store
 *
 * State management for bulk data operations using Zustand patterns.
 * Manages file upload state, import history, export configuration, and progress tracking.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface ImportOptions {
  createMissing: boolean;
  duplicateHandling: 'skip' | 'overwrite' | 'merge';
  backgroundThreshold: number;
  validateOnly: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
  severity: 'error' | 'warning';
}

export interface RowValidationError {
  row: number;
  errors: ValidationError[];
}

export interface ValidationResult {
  isValid: boolean;
  headerErrors: string[];
  rowErrors: RowValidationError[];
  preview: Record<string, string>[];
}

export interface ImportResult {
  success: boolean;
  importId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ValidationError[];
  createdEntities: {
    sites: number;
    cells: number;
    equipment: number;
    plcs: number;
  };
  isBackground: boolean;
}

export interface ImportHistoryItem {
  id: string;
  userId: string;
  filename: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  options: ImportOptions;
  errors: ValidationError[];
  createdEntities: {
    sites: number;
    cells: number;
    equipment: number;
    plcs: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

export interface PLCFilters {
  sites?: string[];
  cells?: string[];
  equipmentTypes?: string[];
  makes?: string[];
  models?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ExportOptions {
  includeHierarchy: boolean;
  includeTags: boolean;
  format: 'csv';
}

// Store State
export interface ImportExportState {
  // Import state
  uploadProgress: number;
  importStatus: 'idle' | 'uploading' | 'validating' | 'importing' | 'completed' | 'error';
  selectedFile: File | null;
  previewData: Record<string, string>[];
  validationErrors: ValidationError[];
  validationResult: ValidationResult | null;
  importResult: ImportResult | null;
  importOptions: ImportOptions;

  // Export state
  exportFilters: PLCFilters;
  exportOptions: ExportOptions;
  exportProgress: number;
  exportStatus: 'idle' | 'preparing' | 'exporting' | 'downloading' | 'completed' | 'error';

  // History state
  importHistory: ImportHistoryItem[];
  historyLoading: boolean;
  historyPage: number;
  historyTotal: number;

  // Error state
  error: string | null;
}

// Store Actions
export interface ImportExportActions {
  // File upload actions
  setSelectedFile: (file: File | null) => void;
  setUploadProgress: (progress: number) => void;
  setImportStatus: (status: ImportExportState['importStatus']) => void;

  // Validation actions
  setValidationResult: (result: ValidationResult | null) => void;
  clearValidationErrors: () => void;

  // Import actions
  setImportOptions: (options: Partial<ImportOptions>) => void;
  setImportResult: (result: ImportResult | null) => void;
  resetImportState: () => void;

  // Export actions
  setExportFilters: (filters: Partial<PLCFilters>) => void;
  setExportOptions: (options: Partial<ExportOptions>) => void;
  setExportProgress: (progress: number) => void;
  setExportStatus: (status: ImportExportState['exportStatus']) => void;
  resetExportState: () => void;

  // History actions
  setImportHistory: (history: ImportHistoryItem[], total: number, page: number) => void;
  setHistoryLoading: (loading: boolean) => void;
  addImportToHistory: (importItem: ImportHistoryItem) => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Combined actions
  resetAll: () => void;
}

type ImportExportStore = ImportExportState & ImportExportActions;

// Default state values
const defaultImportOptions: ImportOptions = {
  createMissing: false,
  duplicateHandling: 'skip',
  backgroundThreshold: 1000,
  validateOnly: false,
};

const defaultExportFilters: PLCFilters = {};

const defaultExportOptions: ExportOptions = {
  includeHierarchy: true,
  includeTags: false,
  format: 'csv',
};

// Create the store
export const useImportExportStore = create<ImportExportStore>()(
  devtools(
    immer(set => ({
      // Initial state
      uploadProgress: 0,
      importStatus: 'idle',
      selectedFile: null,
      previewData: [],
      validationErrors: [],
      validationResult: null,
      importResult: null,
      importOptions: defaultImportOptions,

      exportFilters: defaultExportFilters,
      exportOptions: defaultExportOptions,
      exportProgress: 0,
      exportStatus: 'idle',

      importHistory: [],
      historyLoading: false,
      historyPage: 1,
      historyTotal: 0,

      error: null,

      // File upload actions
      setSelectedFile: file =>
        set(state => {
          state.selectedFile = file;
          if (!file) {
            state.previewData = [];
            state.validationResult = null;
            state.validationErrors = [];
          }
        }),

      setUploadProgress: progress =>
        set(state => {
          state.uploadProgress = progress;
        }),

      setImportStatus: status =>
        set(state => {
          state.importStatus = status;
        }),

      // Validation actions
      setValidationResult: result =>
        set(state => {
          state.validationResult = result;
          if (result) {
            state.previewData = result.preview;
            state.validationErrors = result.rowErrors.flatMap(re => re.errors);
          }
        }),

      clearValidationErrors: () =>
        set(state => {
          state.validationErrors = [];
          state.validationResult = null;
        }),

      // Import actions
      setImportOptions: options =>
        set(state => {
          Object.assign(state.importOptions, options);
        }),

      setImportResult: result =>
        set(state => {
          state.importResult = result;
        }),

      resetImportState: () =>
        set(state => {
          state.selectedFile = null;
          state.uploadProgress = 0;
          state.importStatus = 'idle';
          state.previewData = [];
          state.validationErrors = [];
          state.validationResult = null;
          state.importResult = null;
          state.importOptions = { ...defaultImportOptions };
        }),

      // Export actions
      setExportFilters: filters =>
        set(state => {
          Object.assign(state.exportFilters, filters);
        }),

      setExportOptions: options =>
        set(state => {
          Object.assign(state.exportOptions, options);
        }),

      setExportProgress: progress =>
        set(state => {
          state.exportProgress = progress;
        }),

      setExportStatus: status =>
        set(state => {
          state.exportStatus = status;
        }),

      resetExportState: () =>
        set(state => {
          state.exportFilters = { ...defaultExportFilters };
          state.exportOptions = { ...defaultExportOptions };
          state.exportProgress = 0;
          state.exportStatus = 'idle';
        }),

      // History actions
      setImportHistory: (history, total, page) =>
        set(state => {
          state.importHistory = history;
          state.historyTotal = total;
          state.historyPage = page;
        }),

      setHistoryLoading: loading =>
        set(state => {
          state.historyLoading = loading;
        }),

      addImportToHistory: importItem =>
        set(state => {
          state.importHistory.unshift(importItem);
          state.historyTotal += 1;
        }),

      // Error actions
      setError: error =>
        set(state => {
          state.error = error;
        }),

      clearError: () =>
        set(state => {
          state.error = null;
        }),

      // Combined actions
      resetAll: () =>
        set(state => {
          // Reset import state
          state.selectedFile = null;
          state.uploadProgress = 0;
          state.importStatus = 'idle';
          state.previewData = [];
          state.validationErrors = [];
          state.validationResult = null;
          state.importResult = null;
          state.importOptions = { ...defaultImportOptions };

          // Reset export state
          state.exportFilters = { ...defaultExportFilters };
          state.exportOptions = { ...defaultExportOptions };
          state.exportProgress = 0;
          state.exportStatus = 'idle';

          // Clear error
          state.error = null;

          // Keep history state intact
        }),
    })),
    {
      name: 'import-export-store',
      partialize: (state: ImportExportState) => ({
        importOptions: state.importOptions,
        exportOptions: state.exportOptions,
        exportFilters: state.exportFilters,
      }),
    }
  )
);

// Selectors for commonly used derived state
export const useImportState = () =>
  useImportExportStore(state => ({
    uploadProgress: state.uploadProgress,
    importStatus: state.importStatus,
    selectedFile: state.selectedFile,
    previewData: state.previewData,
    validationErrors: state.validationErrors,
    validationResult: state.validationResult,
    importResult: state.importResult,
    importOptions: state.importOptions,
    error: state.error,
  }));

export const useExportState = () =>
  useImportExportStore(state => ({
    exportFilters: state.exportFilters,
    exportOptions: state.exportOptions,
    exportProgress: state.exportProgress,
    exportStatus: state.exportStatus,
    error: state.error,
  }));

export const useImportHistory = () =>
  useImportExportStore(state => ({
    importHistory: state.importHistory,
    historyLoading: state.historyLoading,
    historyPage: state.historyPage,
    historyTotal: state.historyTotal,
  }));

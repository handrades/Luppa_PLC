import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  ExportFilters,
  ExportOptions,
  ImportLog,
  ImportOptions,
  ImportPreview,
  ImportResult,
  ValidationError,
} from '../types/import-export';
import { importExportService } from '../services/importExport.service';

interface ImportExportState {
  // Import state
  file: File | null;
  preview: ImportPreview | null;
  validationErrors: ValidationError[];
  importResult: ImportResult | null;
  importProgress: ImportResult | null;
  isImporting: boolean;
  importError: string | null;

  // Export state
  isExporting: boolean;
  exportError: string | null;

  // Import history state
  importHistory: ImportLog[];
  historyTotal: number;
  historyPage: number;
  historyPageSize: number;
  isLoadingHistory: boolean;

  // Actions - Import
  uploadFile: (file: File) => Promise<void>;
  validateFile: (file: File) => Promise<boolean>;
  startImport: (file: File, options: ImportOptions) => Promise<ImportResult>;
  clearImport: () => void;

  // Actions - Export
  exportData: (filters: ExportFilters, options: ExportOptions) => Promise<ArrayBuffer | null>;
  downloadTemplate: () => Promise<void>;

  // Actions - History
  loadImportHistory: (page?: number, pageSize?: number) => Promise<void>;
  rollbackImport: (importId: string) => Promise<void>;
  getImportDetails: (importId: string) => Promise<ImportLog | null>;
}

export const useImportExportStore = create<ImportExportState>()(
  devtools(
    (set, get) => ({
      // Initial state
      file: null,
      preview: null,
      validationErrors: [],
      importResult: null,
      importProgress: null,
      isImporting: false,
      importError: null,

      isExporting: false,
      exportError: null,

      importHistory: [],
      historyTotal: 0,
      historyPage: 1,
      historyPageSize: 20,
      isLoadingHistory: false,

      // Upload and validate file
      uploadFile: async (file: File) => {
        set({ file, importError: null });

        try {
          // Read file and get preview
          const preview = await importExportService.previewImport(file);
          set({
            preview,
            validationErrors: preview.validationErrors,
          });
        } catch (error) {
          set({
            importError: error instanceof Error ? error.message : 'Failed to upload file',
            preview: null,
            validationErrors: [],
          });
        }
      },

      // Validate file
      validateFile: async (file: File) => {
        try {
          const preview = await importExportService.previewImport(file);
          const errors = preview.validationErrors.filter(e => e.severity === 'error');

          set({
            preview,
            validationErrors: preview.validationErrors,
          });

          return errors.length === 0;
        } catch (error) {
          set({
            importError: error instanceof Error ? error.message : 'Failed to validate file',
            validationErrors: [],
          });
          return false;
        }
      },

      // Start import
      startImport: async (file: File, options: ImportOptions) => {
        set({ isImporting: true, importError: null, importProgress: null });

        try {
          const result = await importExportService.importPLCs(file, options);

          set({
            importResult: result,
            importProgress: result,
            isImporting: false,
          });

          // Reload import history
          await get().loadImportHistory();

          return result;
        } catch (error) {
          const errorResult: ImportResult = {
            success: false,
            totalRows: 0,
            processedRows: 0,
            skippedRows: 0,
            errors: [],
            warnings: [],
            importId: '',
            duration: 0,
          };

          set({
            importError: error instanceof Error ? error.message : 'Import failed',
            importResult: errorResult,
            importProgress: errorResult, // Set importProgress to failure state
            isImporting: false,
          });

          return errorResult;
        }
      },

      // Clear import state
      clearImport: () => {
        set({
          file: null,
          preview: null,
          validationErrors: [],
          importResult: null,
          importProgress: null,
          importError: null,
        });
      },

      // Export data
      exportData: async (filters: ExportFilters, options: ExportOptions) => {
        set({ isExporting: true, exportError: null });

        try {
          const data = await importExportService.exportPLCs(filters, options);
          set({ isExporting: false });
          return data;
        } catch (error) {
          set({
            exportError: error instanceof Error ? error.message : 'Export failed',
            isExporting: false,
          });
          return null;
        }
      },

      // Download template
      downloadTemplate: async () => {
        try {
          const template = await importExportService.downloadTemplate();

          // Trigger download
          const blob = new Blob([template], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'plc_import_template.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          set({
            importError: error instanceof Error ? error.message : 'Failed to download template',
          });
        }
      },

      // Load import history
      loadImportHistory: async (page?: number, pageSize?: number) => {
        const currentPage = page || get().historyPage;
        const currentPageSize = pageSize || get().historyPageSize;

        set({ isLoadingHistory: true });

        try {
          const response = await importExportService.getImportHistory(currentPage, currentPageSize);

          set({
            importHistory: response.data,
            historyTotal: response.total,
            historyPage: currentPage,
            historyPageSize: currentPageSize,
            isLoadingHistory: false,
          });
        } catch {
          set({
            importHistory: [],
            isLoadingHistory: false,
          });
        }
      },

      // Rollback import
      rollbackImport: async (importId: string) => {
        try {
          await importExportService.rollbackImport(importId);

          // Reload history to reflect the change
          await get().loadImportHistory();
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Rollback failed');
        }
      },

      // Get import details
      getImportDetails: async (importId: string) => {
        try {
          const details = await importExportService.getImportDetails(importId);
          return details;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'import-export-store',
    }
  )
);

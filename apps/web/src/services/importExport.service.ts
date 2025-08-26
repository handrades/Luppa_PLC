import { apiClient } from './api.client';
import {
  ExportFilters,
  ExportOptions,
  ImportLog,
  ImportOptions,
  ImportPreview,
  ImportResult,
  ImportRollback,
} from '../types/import-export';

class ImportExportService {
  /**
   * Download CSV template for importing PLCs
   */
  async downloadTemplate(): Promise<ArrayBuffer> {
    const response = await apiClient.get('/import/template', {
      responseType: 'arraybuffer',
    });
    return response.data;
  }

  /**
   * Preview and validate CSV file before import
   */
  async previewImport(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Import PLCs from CSV file
   */
  async importPLCs(file: File, options: ImportOptions): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    // Append options as form data
    Object.entries(options).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await apiClient.post('/import/plcs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Handle background processing response
    if (response.status === 202) {
      // Import queued for background processing
      return {
        success: true,
        totalRows: response.data.totalRows,
        processedRows: 0,
        skippedRows: 0,
        errors: [],
        warnings: [],
        importId: response.data.importId,
        duration: 0,
      };
    }

    return response.data.data;
  }

  /**
   * Export PLCs to CSV or JSON
   */
  async exportPLCs(filters: ExportFilters, options: ExportOptions): Promise<ArrayBuffer> {
    const response = await apiClient.post('/export/plcs', filters, {
      params: options,
      responseType: 'arraybuffer',
    });

    return response.data;
  }

  /**
   * Get import history
   */
  async getImportHistory(
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: ImportLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const response = await apiClient.get('/import/history', {
      params: { page, pageSize },
    });

    return {
      data: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      pageSize: response.data.pagination.pageSize,
    };
  }

  /**
   * Get specific import log details
   */
  async getImportDetails(importId: string): Promise<ImportLog> {
    const response = await apiClient.get(`/import/${importId}`);
    return response.data.data;
  }

  /**
   * Rollback a completed import
   */
  async rollbackImport(importId: string): Promise<ImportRollback> {
    const response = await apiClient.post(`/import/${importId}/rollback`);
    return response.data.data;
  }

  /**
   * Check import status (for background jobs)
   */
  async checkImportStatus(importId: string): Promise<ImportLog> {
    const response = await apiClient.get(`/import/${importId}/status`);
    return response.data.data;
  }
}

export const importExportService = new ImportExportService();

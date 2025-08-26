/**
 * Import/Export Service
 *
 * API service layer for bulk data operations using axios patterns.
 * Handles file upload with progress tracking, export requests, and import history.
 */

import axios, { AxiosProgressEvent } from 'axios';
import {
  ExportOptions,
  ImportHistoryItem,
  ImportOptions,
  ImportResult,
  PLCFilters,
  ValidationResult,
} from '../stores/importExport.store';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api/v1',
  timeout: 300000, // 5 minutes for large uploads
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export class ImportExportService {
  /**
   * Download CSV template for PLC imports
   */
  static async downloadTemplate(): Promise<void> {
    try {
      const response = await api.get('/import/template', {
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'plc-import-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to download template:', error);
      throw new Error('Failed to download CSV template');
    }
  }

  /**
   * Validate CSV file without importing
   */
  static async validateFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ValidationResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{ success: boolean; validation: ValidationResult }>(
        '/import/validate',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total && onProgress) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );

      return response.data.validation;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('File validation failed:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'File validation failed';
        throw new Error(message);
      }
      throw new Error('File validation failed');
    }
  }

  /**
   * Import PLCs from CSV file
   */
  static async importPLCs(
    file: File,
    options: ImportOptions,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add options as form fields
      formData.append('createMissing', String(options.createMissing));
      formData.append('duplicateHandling', options.duplicateHandling);
      formData.append('backgroundThreshold', String(options.backgroundThreshold));
      formData.append('validateOnly', String(options.validateOnly));

      const response = await api.post<ImportResult>('/import/plcs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Import failed:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Import failed';
        throw new Error(message);
      }
      throw new Error('Import failed');
    }
  }

  /**
   * Export PLCs to CSV with filters
   */
  static async exportPLCs(
    filters: PLCFilters,
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const response = await api.post(
        '/export/plcs',
        {
          filters,
          options,
        },
        {
          responseType: 'blob',
          onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total && onProgress) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'plc-export.csv';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Export failed';
        throw new Error(message);
      }
      throw new Error('Export failed');
    }
  }

  /**
   * Get import history with pagination
   */
  static async getImportHistory(
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: ImportHistoryItem[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await api.get('/import/history', {
        params: { page, pageSize },
      });

      // Convert date strings to Date objects
      const data = response.data.data.map((item: ImportHistoryItem) => ({
        ...item,
        startedAt: new Date(item.startedAt),
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      }));

      return {
        data,
        pagination: response.data.pagination,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch import history:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to fetch import history';
        throw new Error(message);
      }
      throw new Error('Failed to fetch import history');
    }
  }

  /**
   * Rollback a specific import
   */
  static async rollbackImport(importId: string): Promise<void> {
    try {
      await api.post(`/import/${importId}/rollback`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Rollback failed:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Rollback failed';
        throw new Error(message);
      }
      throw new Error('Rollback failed');
    }
  }

  /**
   * Get import status (for background jobs - future implementation)
   */
  static async getImportStatus(importId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
  }> {
    try {
      const response = await api.get(`/import/${importId}/status`);
      return response.data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get import status:', error);
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Failed to get import status';
        throw new Error(message);
      }
      throw new Error('Failed to get import status');
    }
  }

  /**
   * Poll import status for background jobs
   */
  static pollImportStatus(
    importId: string,
    onStatusUpdate: (status: string, progress: number) => void,
    intervalMs: number = 2000
  ): () => void {
    // eslint-disable-next-line prefer-const
    let intervalId: NodeJS.Timeout;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        const { status, progress } = await this.getImportStatus(importId);
        onStatusUpdate(status, progress);

        if (status === 'completed' || status === 'failed') {
          isPolling = false;
          clearInterval(intervalId);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Polling error:', error);
        // Continue polling on error, but could add retry logic here
      }
    };

    intervalId = setInterval(poll, intervalMs);
    poll(); // Initial poll

    // Return cleanup function
    return () => {
      isPolling = false;
      clearInterval(intervalId);
    };
  }
}

export default ImportExportService;

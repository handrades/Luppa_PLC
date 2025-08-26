/**
 * ImportExport Service Tests
 *
 * Tests for API service layer handling file uploads, exports, and import history.
 */

import axios from 'axios';
import { ImportExportService } from '../importExport.service';
import type { ExportOptions, ImportOptions, PLCFilters } from '../../stores/importExport.store';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  isAxiosError: jest.fn(() => false),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock DOM APIs
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'mock-token'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
});

// Mock URL and link creation
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => mockLink),
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
});

describe('ImportExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadTemplate', () => {
    it('should download CSV template successfully', async () => {
      const mockBlob = new Blob(['mock,csv,content'], { type: 'text/csv' });
      mockAxiosInstance.get.mockResolvedValue({ data: mockBlob });

      await ImportExportService.downloadTemplate();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/import/template', {
        responseType: 'blob',
      });
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle template download error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(ImportExportService.downloadTemplate()).rejects.toThrow('Failed to download CSV template');
    });
  });

  describe('validateFile', () => {
    it('should validate CSV file successfully', async () => {
      const mockValidationResult = {
        isValid: true,
        headerErrors: [],
        rowErrors: [],
        preview: [{ field1: 'value1' }],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, validation: mockValidationResult },
      });

      const testFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const onProgress = jest.fn();

      const result = await ImportExportService.validateFile(testFile, onProgress);

      expect(result).toEqual(mockValidationResult);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/import/validate',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function),
        })
      );
    });

    it('should handle validation error', async () => {
      const errorResponse = { response: { data: { error: 'Invalid file format' } } };
      mockAxiosInstance.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const testFile = new File(['content'], 'test.csv');

      await expect(ImportExportService.validateFile(testFile)).rejects.toThrow('Invalid file format');
    });

    it('should track upload progress', async () => {
      const mockValidationResult = { isValid: true, headerErrors: [], rowErrors: [], preview: [] };
      mockAxiosInstance.post.mockImplementation((_url: unknown, _data: unknown, config: { onUploadProgress?: (event: { loaded: number; total: number }) => void }) => {
        // Simulate progress event
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 });
        }
        return Promise.resolve({ data: { validation: mockValidationResult } });
      });

      const testFile = new File(['content'], 'test.csv');
      const onProgress = jest.fn();

      await ImportExportService.validateFile(testFile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });

  describe('importPLCs', () => {
    it('should import PLCs successfully', async () => {
      const mockImportResult = {
        success: true,
        importId: 'test-id',
        totalRows: 10,
        successfulRows: 10,
        failedRows: 0,
        errors: [],
        createdEntities: { sites: 1, cells: 1, equipment: 1, plcs: 10 },
        isBackground: false,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockImportResult });

      const testFile = new File(['content'], 'test.csv');
      const options: ImportOptions = {
        createMissing: true,
        duplicateHandling: 'skip',
        backgroundThreshold: 1000,
        validateOnly: false,
      };

      const result = await ImportExportService.importPLCs(testFile, options);

      expect(result).toEqual(mockImportResult);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/import/plcs',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function),
        })
      );
    });

    it('should include all import options in FormData', async () => {
      const mockImportResult = { success: true, importId: 'test' };
      let capturedFormData: FormData | null = null;

      mockAxiosInstance.post.mockImplementation((_url: unknown, data: FormData) => {
        capturedFormData = data;
        return Promise.resolve({ data: mockImportResult });
      });

      const testFile = new File(['content'], 'test.csv');
      const options: ImportOptions = {
        createMissing: true,
        duplicateHandling: 'overwrite',
        backgroundThreshold: 500,
        validateOnly: true,
      };

      await ImportExportService.importPLCs(testFile, options);

      expect(capturedFormData?.get('createMissing')).toBe('true');
      expect(capturedFormData?.get('duplicateHandling')).toBe('overwrite');
      expect(capturedFormData?.get('backgroundThreshold')).toBe('500');
      expect(capturedFormData?.get('validateOnly')).toBe('true');
    });
  });

  describe('exportPLCs', () => {
    it('should export PLCs successfully', async () => {
      const mockBlob = new Blob(['exported,data'], { type: 'text/csv' });
      mockAxiosInstance.post.mockResolvedValue({
        data: mockBlob,
        headers: { 'content-disposition': 'attachment; filename="export-2024.csv"' },
      });

      const filters: PLCFilters = { sites: ['Plant A'] };
      const options: ExportOptions = { includeHierarchy: true, includeTags: false, format: 'csv' };

      await ImportExportService.exportPLCs(filters, options);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/export/plcs',
        { filters, options },
        expect.objectContaining({
          responseType: 'blob',
          onDownloadProgress: expect.any(Function),
        })
      );
      expect(mockLink.download).toBe('export-2024.csv');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should use default filename when content-disposition header missing', async () => {
      const mockBlob = new Blob(['exported,data'], { type: 'text/csv' });
      mockAxiosInstance.post.mockResolvedValue({
        data: mockBlob,
        headers: {},
      });

      const filters: PLCFilters = {};
      const options: ExportOptions = { includeHierarchy: true, includeTags: false, format: 'csv' };

      await ImportExportService.exportPLCs(filters, options);

      expect(mockLink.download).toBe('plc-export.csv');
    });
  });

  describe('getImportHistory', () => {
    it('should fetch import history successfully', async () => {
      const mockHistory = {
        data: [
          {
            id: '1',
            filename: 'test.csv',
            totalRows: 10,
            startedAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockHistory });

      const result = await ImportExportService.getImportHistory(1, 20);

      expect(result.data[0].startedAt).toBeInstanceOf(Date);
      expect(result.pagination).toEqual(mockHistory.pagination);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/import/history', {
        params: { page: 1, pageSize: 20 },
      });
    });
  });

  describe('rollbackImport', () => {
    it('should rollback import successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({});

      await ImportExportService.rollbackImport('test-import-id');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/import/test-import-id/rollback');
    });

    it('should handle rollback error', async () => {
      const errorResponse = { response: { data: { error: 'Import not found' } } };
      mockAxiosInstance.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(ImportExportService.rollbackImport('invalid-id')).rejects.toThrow('Import not found');
    });
  });

  describe('getImportStatus', () => {
    it('should get import status successfully', async () => {
      const mockStatus = { status: 'processing', progress: 75 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

      const result = await ImportExportService.getImportStatus('test-id');

      expect(result).toEqual(mockStatus);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/import/test-id/status');
    });
  });

  describe('pollImportStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll status until completion', async () => {
      let callCount = 0;
      mockAxiosInstance.get.mockImplementation(() => {
        callCount++;
        const status = callCount < 3 ? 'processing' : 'completed';
        return Promise.resolve({ data: { status, progress: callCount * 25 } });
      });

      const onStatusUpdate = jest.fn();
      const cleanup = ImportExportService.pollImportStatus('test-id', onStatusUpdate);

      // Wait for initial call and first interval
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(onStatusUpdate).toHaveBeenCalledTimes(3);
      expect(onStatusUpdate).toHaveBeenLastCalledWith('completed', 75);

      cleanup();
    });

    it('should stop polling when cleanup function is called', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { status: 'processing', progress: 50 } });

      const onStatusUpdate = jest.fn();
      const cleanup = ImportExportService.pollImportStatus('test-id', onStatusUpdate);

      // Start polling
      await Promise.resolve();
      
      // Clean up before next poll
      cleanup();
      
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      // Should only have been called once (initial call)
      expect(onStatusUpdate).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * FileUpload Component Tests
 *
 * Tests for drag-and-drop file upload component including file validation,
 * progress tracking, and user interactions.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';
import { ImportExportService } from '../../../services/importExport.service';

// Mock the ImportExportService
jest.mock('../../../services/importExport.service');
const mockImportExportService = ImportExportService as jest.Mocked<typeof ImportExportService>;

// Mock the store
jest.mock('../../../stores/importExport.store', () => ({
  useImportState: () => ({
    selectedFile: null,
    uploadProgress: 0,
    importStatus: 'idle',
    validationResult: null,
    error: null,
  }),
  useImportExportStore: () => ({
    setSelectedFile: jest.fn(),
    setUploadProgress: jest.fn(),
    setImportStatus: jest.fn(),
    setValidationResult: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the dropzone with correct initial state', () => {
    render(<FileUpload />);
    
    expect(screen.getByText('Drag & drop a CSV file here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 10MB')).toBeInTheDocument();
    expect(screen.getByText('CSV only')).toBeInTheDocument();
    expect(screen.getByText('Download Template')).toBeInTheDocument();
  });

  it('should show error for invalid file type', async () => {
    const user = userEvent.setup();
    render(<FileUpload />);
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    await user.upload(input, file);
    
    // Should show error for non-CSV file
    await waitFor(() => {
      expect(screen.getByText('Only CSV files are allowed')).toBeInTheDocument();
    });
  });

  it('should show error for file size exceeding limit', async () => {
    const user = userEvent.setup();
    render(<FileUpload maxSizeBytes={1024} />); // 1KB limit
    
    // Create a file larger than 1KB
    const largeContent = 'x'.repeat(2048);
    const file = new File([largeContent], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('File size must be less than 0MB')).toBeInTheDocument();
    });
  });

  it('should handle successful file validation', async () => {
    const user = userEvent.setup();
    const mockValidationResult = {
      isValid: true,
      headerErrors: [],
      rowErrors: [],
      preview: [{ field1: 'value1', field2: 'value2' }],
    };
    
    mockImportExportService.validateFile.mockResolvedValue(mockValidationResult);
    
    const onFileSelected = jest.fn();
    const onValidationComplete = jest.fn();
    
    render(
      <FileUpload
        onFileSelected={onFileSelected}
        onValidationComplete={onValidationComplete}
      />
    );
    
    const file = new File(['header1,header2\nvalue1,value2'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockImportExportService.validateFile).toHaveBeenCalledWith(
        file,
        expect.any(Function)
      );
      expect(onFileSelected).toHaveBeenCalledWith(file);
      expect(onValidationComplete).toHaveBeenCalled();
    });
  });

  it('should handle validation errors', async () => {
    const user = userEvent.setup();
    const validationError = new Error('Validation failed');
    
    mockImportExportService.validateFile.mockRejectedValue(validationError);
    
    render(<FileUpload />);
    
    const file = new File(['invalid,csv'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByRole('button', { hidden: true }) as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockImportExportService.validateFile).toHaveBeenCalled();
      // Error should be handled by store
    });
  });

  it('should download template when button is clicked', async () => {
    const user = userEvent.setup();
    mockImportExportService.downloadTemplate.mockResolvedValue();
    
    render(<FileUpload />);
    
    const downloadButton = screen.getByText('Download Template');
    await user.click(downloadButton);
    
    expect(mockImportExportService.downloadTemplate).toHaveBeenCalled();
  });

  it('should handle template download error', async () => {
    const user = userEvent.setup();
    const downloadError = new Error('Download failed');
    
    mockImportExportService.downloadTemplate.mockRejectedValue(downloadError);
    
    render(<FileUpload />);
    
    const downloadButton = screen.getByText('Download Template');
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(mockImportExportService.downloadTemplate).toHaveBeenCalled();
      // Error should be handled by store
    });
  });

  it('should be disabled when specified', () => {
    render(<FileUpload disabled />);
    
    const dropzone = screen.getByRole('button', { hidden: true }).parentElement;
    expect(dropzone).toHaveStyle('cursor: default');
  });

  it('should show validation progress', () => {
    // Mock store to return validating state
    const mockUseImportState = jest.fn(() => ({
      selectedFile: new File(['content'], 'test.csv'),
      uploadProgress: 50,
      importStatus: 'validating',
      validationResult: null,
      error: null,
    }));

    jest.doMock('../../../stores/importExport.store', () => ({
      useImportState: mockUseImportState,
      useImportExportStore: () => ({
        setSelectedFile: jest.fn(),
        setUploadProgress: jest.fn(),
        setImportStatus: jest.fn(),
        setValidationResult: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<FileUpload />);
    
    expect(screen.getByText('Validating file...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show file info after selection', () => {
    // Mock store to return selected file
    const testFile = new File(['content'], 'test.csv');
    const mockUseImportState = jest.fn(() => ({
      selectedFile: testFile,
      uploadProgress: 0,
      importStatus: 'completed',
      validationResult: null,
      error: null,
    }));

    jest.doMock('../../../stores/importExport.store', () => ({
      useImportState: mockUseImportState,
      useImportExportStore: () => ({
        setSelectedFile: jest.fn(),
        setUploadProgress: jest.fn(),
        setImportStatus: jest.fn(),
        setValidationResult: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      }),
    }));

    render(<FileUpload />);
    
    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText('7 Bytes')).toBeInTheDocument();
  });
});

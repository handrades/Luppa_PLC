/**
 * ImportPreview Component Tests
 *
 * Tests for CSV data preview with validation status indicators and error display.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportPreview } from '../ImportPreview';
import type { ValidationResult } from '../../../stores/importExport.store';

// Mock the store
const mockUseImportState = jest.fn();
jest.mock('../../../stores/importExport.store', () => ({
  useImportState: () => mockUseImportState(),
}));

describe('ImportPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show message when no preview data available', () => {
    mockUseImportState.mockReturnValue({
      previewData: [],
      validationResult: null,
    });

    render(<ImportPreview />);
    
    expect(screen.getByText('No preview data available')).toBeInTheDocument();
  });

  it('should render preview table with validation results', () => {
    const mockValidationResult: ValidationResult = {
      isValid: true,
      headerErrors: [],
      rowErrors: [],
      preview: [
        { site_name: 'Plant A', cell_name: 'Line 1', tag_id: 'TAG001' },
        { site_name: 'Plant B', cell_name: 'Line 2', tag_id: 'TAG002' },
      ],
    };

    mockUseImportState.mockReturnValue({
      previewData: mockValidationResult.preview,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview />);
    
    // Check table headers
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Row')).toBeInTheDocument();
    expect(screen.getByText('site_name')).toBeInTheDocument();
    expect(screen.getByText('cell_name')).toBeInTheDocument();
    expect(screen.getByText('tag_id')).toBeInTheDocument();
    
    // Check data rows
    expect(screen.getByText('Plant A')).toBeInTheDocument();
    expect(screen.getByText('Plant B')).toBeInTheDocument();
    expect(screen.getByText('TAG001')).toBeInTheDocument();
    expect(screen.getByText('TAG002')).toBeInTheDocument();
  });

  it('should show validation summary with counts', () => {
    const mockValidationResult: ValidationResult = {
      isValid: false,
      headerErrors: ['Missing required header'],
      rowErrors: [
        {
          row: 2,
          errors: [
            { row: 2, field: 'tag_id', value: '', error: 'Required field', severity: 'error' },
          ],
        },
        {
          row: 3,
          errors: [
            { row: 3, field: 'ip_address', value: 'invalid', error: 'Invalid IP', severity: 'warning' },
          ],
        },
      ],
      preview: [
        { site_name: 'Plant A', cell_name: 'Line 1', tag_id: '' },
        { site_name: 'Plant B', cell_name: 'Line 2', tag_id: 'TAG002' },
      ],
    };

    mockUseImportState.mockReturnValue({
      previewData: mockValidationResult.preview,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview />);
    
    // Check summary counts
    expect(screen.getByText('1 Valid')).toBeInTheDocument();
    expect(screen.getByText('1 Warnings')).toBeInTheDocument();
    expect(screen.getByText('1 Errors')).toBeInTheDocument();
  });

  it('should expand row details when clicked', async () => {
    const user = userEvent.setup();
    const mockValidationResult: ValidationResult = {
      isValid: false,
      headerErrors: [],
      rowErrors: [
        {
          row: 2,
          errors: [
            { row: 2, field: 'tag_id', value: '', error: 'Required field missing', severity: 'error' },
            { row: 2, field: 'ip_address', value: 'invalid', error: 'Invalid format', severity: 'warning' },
          ],
        },
      ],
      preview: [
        { site_name: 'Plant A', cell_name: 'Line 1', tag_id: '' },
      ],
    };

    mockUseImportState.mockReturnValue({
      previewData: mockValidationResult.preview,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview />);
    
    // Find and click the error icon
    const errorButton = screen.getByRole('button', { name: /2 issue/ });
    await user.click(errorButton);
    
    // Check that error details are shown
    expect(screen.getByText('Validation Issues for Row 2:')).toBeInTheDocument();
    expect(screen.getByText('tag_id: Required field missing')).toBeInTheDocument();
    expect(screen.getByText('ip_address: Invalid format')).toBeInTheDocument();
  });

  it('should show header errors in summary', async () => {
    const user = userEvent.setup();
    const mockValidationResult: ValidationResult = {
      isValid: false,
      headerErrors: ['Missing required column: tag_id', 'Extra column: unknown_field'],
      rowErrors: [],
      preview: [],
    };

    mockUseImportState.mockReturnValue({
      previewData: [],
      validationResult: mockValidationResult,
    });

    render(<ImportPreview />);
    
    // Expand summary to see header errors
    const expandButton = screen.getByRole('button', { name: /expand/ });
    await user.click(expandButton);
    
    expect(screen.getByText('Header Issues:')).toBeInTheDocument();
    expect(screen.getByText('Missing required column: tag_id')).toBeInTheDocument();
    expect(screen.getByText('Extra column: unknown_field')).toBeInTheDocument();
  });

  it('should limit displayed rows to maxRows prop', () => {
    const previewData = Array.from({ length: 15 }, (_, i) => ({
      site_name: `Site${i}`,
      tag_id: `TAG${i.toString().padStart(3, '0')}`,
    }));

    const mockValidationResult: ValidationResult = {
      isValid: true,
      headerErrors: [],
      rowErrors: [],
      preview: previewData,
    };

    mockUseImportState.mockReturnValue({
      previewData,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview maxRows={5} />);
    
    // Should only show first 5 rows
    expect(screen.getByText('TAG000')).toBeInTheDocument();
    expect(screen.getByText('TAG004')).toBeInTheDocument();
    expect(screen.queryByText('TAG005')).not.toBeInTheDocument();
    
    // Should show indication of more rows
    expect(screen.getByText(/Showing first 5 of 15 rows/)).toBeInTheDocument();
  });

  it('should call onRowSelect when row is clicked', async () => {
    const user = userEvent.setup();
    const onRowSelect = jest.fn();
    
    const mockValidationResult: ValidationResult = {
      isValid: false,
      headerErrors: [],
      rowErrors: [
        {
          row: 2,
          errors: [
            { row: 2, field: 'tag_id', value: '', error: 'Required', severity: 'error' },
          ],
        },
      ],
      preview: [
        { site_name: 'Plant A', cell_name: 'Line 1', tag_id: '' },
      ],
    };

    mockUseImportState.mockReturnValue({
      previewData: mockValidationResult.preview,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview onRowSelect={onRowSelect} />);
    
    // Click on the row
    const row = screen.getByText('Plant A').closest('tr');
    if (row) {
      await user.click(row);
      expect(onRowSelect).toHaveBeenCalledWith(0);
    }
  });

  it('should show success message when all validation passes', () => {
    const mockValidationResult: ValidationResult = {
      isValid: true,
      headerErrors: [],
      rowErrors: [],
      preview: [
        { site_name: 'Plant A', cell_name: 'Line 1', tag_id: 'TAG001' },
      ],
    };

    mockUseImportState.mockReturnValue({
      previewData: mockValidationResult.preview,
      validationResult: mockValidationResult,
    });

    render(<ImportPreview />);
    
    expect(screen.getByText('File validation successful! Ready to import.')).toBeInTheDocument();
    expect(screen.getByText('1 Valid')).toBeInTheDocument();
  });
});

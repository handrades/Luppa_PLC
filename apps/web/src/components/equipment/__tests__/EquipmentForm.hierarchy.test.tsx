/**
 * Equipment Form Hierarchy Integration Tests
 * Tests for hierarchy integration in EquipmentForm component
 * Story 4.5: Site Hierarchy Management - Task 10
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquipmentForm from '../EquipmentForm';
import { EquipmentFormMode } from '../../../types/equipment-form';
import { EquipmentType } from '../../../types/equipment';

// Mock hierarchy store
const mockHierarchyStore = {
  getCellById: jest.fn(),
};

jest.mock('../../../stores/hierarchy.store', () => ({
  useHierarchyStore: () => mockHierarchyStore,
}));

// Mock hierarchy components
jest.mock('../../hierarchy/SiteDropdown', () => ({
  SiteDropdown: ({
    value,
    onChange,
    error,
    disabled,
    required,
    helperText,
  }: {
    value?: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    helperText?: string;
  }) => (
    <div data-testid='site-dropdown'>
      <input
        data-testid='site-input'
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        placeholder={helperText}
      />
      {error && <div data-testid='site-error'>{error}</div>}
    </div>
  ),
}));

jest.mock('../../hierarchy/CellSelector', () => ({
  CellSelector: ({
    siteId,
    value,
    onChange,
    error,
    disabled,
    required,
    helperText,
  }: {
    siteId?: string;
    value?: string;
    onChange: (value: string, cell: unknown) => void;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    helperText?: string;
  }) => (
    <div data-testid='cell-selector'>
      <input
        data-testid='cell-input'
        value={value || ''}
        onChange={e => onChange(e.target.value, { id: e.target.value, name: 'Test Cell' })}
        disabled={disabled}
        required={required}
        placeholder={helperText}
      />
      {error && <div data-testid='cell-error'>{error}</div>}
      <div data-testid='cell-site-id'>{siteId}</div>
    </div>
  ),
}));

// Mock other components
jest.mock('../TagInput', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) => (
    <input
      data-testid='tag-input'
      value={value.join(',')}
      onChange={e => onChange(e.target.value.split(',').filter(Boolean))}
    />
  ),
}));

jest.mock('../IpAddressInput', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
    <input data-testid='ip-input' value={value || ''} onChange={e => onChange(e.target.value)} />
  ),
}));

describe('EquipmentForm Hierarchy Integration', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    mode: EquipmentFormMode.CREATE,
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render site dropdown and cell selector', () => {
    render(<EquipmentForm {...defaultProps} />);

    expect(screen.getByTestId('site-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('cell-selector')).toBeInTheDocument();
  });

  it('should pass site selection to cell selector', async () => {
    const user = userEvent.setup();
    render(<EquipmentForm {...defaultProps} />);

    const siteInput = screen.getByTestId('site-input');
    await user.type(siteInput, 'site-123');

    await waitFor(() => {
      expect(screen.getByTestId('cell-site-id')).toHaveTextContent('site-123');
    });
  });

  it('should clear cell selection when site changes', async () => {
    const user = userEvent.setup();
    render(<EquipmentForm {...defaultProps} />);

    const siteInput = screen.getByTestId('site-input');
    const cellInput = screen.getByTestId('cell-input');

    // Select a site and cell
    await user.type(siteInput, 'site-123');
    await user.type(cellInput, 'cell-456');

    // Change site
    await user.clear(siteInput);
    await user.type(siteInput, 'site-789');

    await waitFor(() => {
      expect(cellInput).toHaveValue('');
    });
  });

  it('should disable cell selector when no site is selected', () => {
    render(<EquipmentForm {...defaultProps} />);

    const cellInput = screen.getByTestId('cell-input');
    expect(cellInput).toBeDisabled();
  });

  it('should initialize hierarchy from existing equipment data', async () => {
    const mockCell = {
      id: 'cell-123',
      siteId: 'site-456',
      name: 'Test Cell',
      lineNumber: 'LINE-01',
      siteName: 'Test Site',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    mockHierarchyStore.getCellById.mockResolvedValue(mockCell);

    const initialData = {
      id: 'equipment-1',
      name: 'Test Equipment',
      equipmentType: EquipmentType.PLC,
      cellId: 'cell-123',
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      siteName: 'Test Site',
      cellName: 'Test Cell',
      cellType: 'Assembly Line',
    };

    render(
      <EquipmentForm {...defaultProps} mode={EquipmentFormMode.EDIT} initialData={initialData} />
    );

    await waitFor(() => {
      expect(mockHierarchyStore.getCellById).toHaveBeenCalledWith('cell-123');
    });

    await waitFor(() => {
      expect(screen.getByTestId('site-input')).toHaveValue('site-456');
      expect(screen.getByTestId('cell-input')).toHaveValue('cell-123');
    });
  });

  it('should validate form requires both site and cell selection', async () => {
    const user = userEvent.setup();
    render(<EquipmentForm {...defaultProps} />);

    // Fill required fields except hierarchy
    await user.type(screen.getByLabelText(/equipment name/i), 'Test Equipment');
    await user.type(screen.getByLabelText(/tag id/i), 'TAG001');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');
    await user.type(screen.getByLabelText(/make/i), 'Test Make');
    await user.type(screen.getByLabelText(/model/i), 'Test Model');

    // Try to submit without site/cell
    const submitButton = screen.getByRole('button', {
      name: /create equipment/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit when all required fields including hierarchy are filled', async () => {
    const user = userEvent.setup();
    render(<EquipmentForm {...defaultProps} />);

    // Fill all required fields
    await user.type(screen.getByLabelText(/equipment name/i), 'Test Equipment');
    await user.type(screen.getByLabelText(/tag id/i), 'TAG001');
    await user.type(screen.getByLabelText(/description/i), 'Test Description');
    await user.type(screen.getByLabelText(/make/i), 'Test Make');
    await user.type(screen.getByLabelText(/model/i), 'Test Model');

    // Fill hierarchy
    await user.type(screen.getByTestId('site-input'), 'site-123');
    await user.type(screen.getByTestId('cell-input'), 'cell-456');

    await waitFor(() => {
      const submitButton = screen.getByRole('button', {
        name: /create equipment/i,
      });
      expect(submitButton).toBeEnabled();
    });
  });
});

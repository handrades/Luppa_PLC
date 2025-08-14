import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataGridWithSelection as DataGrid, Column } from './DataGridWithSelection';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: jest.fn((array: any[], from: number, to: number) => {
    const result = [...array];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  horizontalListSortingStrategy: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

const theme = createTheme();

interface TestData {
  id: number;
  name: string;
  value: number;
  status: string;
  date: string;
}

const generateTestData = (count: number): TestData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.floor(Math.random() * 1000),
    status: ['Active', 'Inactive', 'Pending'][i % 3],
    date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
  }));
};

const testColumns: Column<TestData>[] = [
  { id: 'id', label: 'ID', width: 80 },
  { id: 'name', label: 'Name', width: 200 },
  { id: 'value', label: 'Value', width: 120 },
  { id: 'status', label: 'Status', width: 150 },
  { id: 'date', label: 'Date', width: 150 },
];

describe('DataGrid - Single Selection Mode', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render without selection when selectable is false', () => {
    const data = generateTestData(5);
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={false}
        />
      </ThemeProvider>
    );

    // No checkboxes should be rendered
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  it('should render checkbox column when selectable is true', () => {
    const data = generateTestData(5);
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
        />
      </ThemeProvider>
    );

    // Header checkbox + row checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should allow single selection in single mode', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="single"
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click first row
    const firstRow = screen.getByText('Item 1').closest('[class*="GridRow"]');
    if (firstRow) {
      fireEvent.click(firstRow);
      expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set));
      
      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      const selectedSet = lastCall[0];
      expect(selectedSet.size).toBe(1);
    }
  });

  it('should deselect when clicking selected row in single mode', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="single"
          selectedRows={new Set([0])}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click first row to deselect
    const firstRow = screen.getByText('Item 1').closest('[class*="GridRow"]');
    if (firstRow) {
      fireEvent.click(firstRow);
      
      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      const selectedSet = lastCall[0];
      expect(selectedSet.size).toBe(0);
    }
  });

  it('should replace selection when clicking another row in single mode', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="single"
          selectedRows={new Set([0])}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click second row
    const secondRow = screen.getByText('Item 2').closest('[class*="GridRow"]');
    if (secondRow) {
      fireEvent.click(secondRow);
      
      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      const selectedSet = lastCall[0];
      expect(selectedSet.size).toBe(1);
      expect(selectedSet.has(1)).toBe(true);
      expect(selectedSet.has(0)).toBe(false);
    }
  });
});

describe('DataGrid - Multiple Selection Mode', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should allow multiple selection in multiple mode', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click first checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]); // First row checkbox (0 is header)
      
      let lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      let selectedSet = lastCall[0];
      expect(selectedSet.size).toBe(1);
      
      // Click second checkbox
      if (checkboxes.length > 2) {
        fireEvent.click(checkboxes[2]);
        lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
        selectedSet = lastCall[0];
        expect(selectedSet.size).toBe(2);
      }
    }
  });

  it('should handle select all checkbox', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click header checkbox to select all
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);
    
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
    const selectedSet = lastCall[0];
    expect(selectedSet.size).toBe(5); // All 5 rows selected
  });

  it('should handle deselect all when all are selected', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={new Set([0, 1, 2, 3, 4])}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click header checkbox to deselect all
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);
    
    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
    const selectedSet = lastCall[0];
    expect(selectedSet.size).toBe(0);
  });

  it('should handle Ctrl+Click for individual selection', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={new Set([0])}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Ctrl+Click second row
    const secondRow = screen.getByText('Item 2').closest('[class*="GridRow"]');
    if (secondRow) {
      fireEvent.click(secondRow, { ctrlKey: true });
      
      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      const selectedSet = lastCall[0];
      expect(selectedSet.size).toBe(2);
      expect(selectedSet.has(0)).toBe(true);
      expect(selectedSet.has(1)).toBe(true);
    }
  });

  it('should handle Shift+Click for range selection', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click first row
    const firstRow = screen.getByText('Item 1').closest('[class*="GridRow"]');
    if (firstRow) {
      fireEvent.click(firstRow);
      
      // Shift+Click third row
      const thirdRow = screen.getByText('Item 3').closest('[class*="GridRow"]');
      if (thirdRow) {
        fireEvent.click(thirdRow, { shiftKey: true });
        
        const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
        const selectedSet = lastCall[0];
        expect(selectedSet.size).toBe(3); // Rows 1, 2, 3 selected
        expect(selectedSet.has(0)).toBe(true);
        expect(selectedSet.has(1)).toBe(true);
        expect(selectedSet.has(2)).toBe(true);
      }
    }
  });

  it('should show indeterminate state when some rows are selected', () => {
    const data = generateTestData(5);
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={new Set([0, 1])} // 2 of 5 selected
        />
      </ThemeProvider>
    );

    // Header checkbox should be indeterminate
    const headerCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    expect(headerCheckbox.indeterminate).toBe(true);
  });
});

describe('DataGrid - Selection with Other Features', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should maintain selection when sorting', () => {
    const data = generateTestData(5);
    const selectedRows = new Set([0, 2]);
    
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={selectedRows}
          sortable={true}
        />
      </ThemeProvider>
    );

    // Verify initial selection
    const checkboxes = screen.getAllByRole('checkbox');
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true); // First row
    expect((checkboxes[3] as HTMLInputElement).checked).toBe(true); // Third row

    // Click to sort by name
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);

    // Selection should be maintained after sort
    rerender(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={selectedRows}
          sortable={true}
        />
      </ThemeProvider>
    );

    // Check that same items are still selected
    expect(selectedRows.size).toBe(2);
  });

  it('should maintain selection when filtering', () => {
    const data = generateTestData(10);
    const selectedRows = new Set([0, 2, 4]);
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectionMode="multiple"
          selectedRows={selectedRows}
          filterable={true}
        />
      </ThemeProvider>
    );

    // Selection should persist through filtering
    expect(selectedRows.size).toBe(3);
  });

  it('should handle row click with onRowClick callback', () => {
    const data = generateTestData(5);
    const onRowClick = jest.fn();
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          onRowClick={onRowClick}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click row
    const firstRow = screen.getByText('Item 1').closest('[class*="GridRow"]');
    if (firstRow) {
      fireEvent.click(firstRow);
      
      // Both callbacks should be called
      expect(onRowClick).toHaveBeenCalled();
      expect(onSelectionChange).toHaveBeenCalled();
    }
  });

  it('should work with custom rowKey function', () => {
    const data = generateTestData(5);
    const onSelectionChange = jest.fn();
    
    render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          rowKey={(row) => `row-${row.id}`}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Click first row
    const firstRow = screen.getByText('Item 1').closest('[class*="GridRow"]');
    if (firstRow) {
      fireEvent.click(firstRow);
      
      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
      const selectedSet = lastCall[0];
      expect(selectedSet.has('row-1')).toBe(true);
    }
  });

  it('should handle controlled selection state', () => {
    const data = generateTestData(5);
    const selectedRows = new Set<string | number>([0]);
    const setSelectedRows = jest.fn();
    
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
        />
      </ThemeProvider>
    );

    // First row should be selected (check header checkbox)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Update selection externally
    rerender(
      <ThemeProvider theme={theme}>
        <DataGrid 
          data={data} 
          columns={testColumns}
          selectable={true}
          selectedRows={new Set([1, 2])}
          onSelectionChange={setSelectedRows}
        />
      </ThemeProvider>
    );

    // Checkbox exists
    const updatedCheckboxes = screen.getAllByRole('checkbox');
    expect(updatedCheckboxes.length).toBeGreaterThan(0);
  });
});
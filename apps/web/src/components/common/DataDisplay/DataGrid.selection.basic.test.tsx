import React from 'react';
import { render, screen } from '@testing-library/react';
import { Column, DataGridWithSelection as DataGrid } from './DataGridWithSelection';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock @tanstack/react-virtual
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(() => ({
    getVirtualItems: () => [
      { index: 0, start: 0, size: 52, key: 0 },
      { index: 1, start: 52, size: 52, key: 1 },
      { index: 2, start: 104, size: 52, key: 2 },
    ],
    getTotalSize: () => 156,
    scrollToIndex: jest.fn(),
    scrollToOffset: jest.fn(),
  })),
}));

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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
  arrayMove: jest.fn((array: unknown[], from: number, to: number) => {
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
}

const testData: TestData[] = [
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 },
  { id: 3, name: 'Item 3', value: 300 },
];

const testColumns: Column<TestData>[] = [
  { id: 'id', label: 'ID', width: 80 },
  { id: 'name', label: 'Name', width: 200 },
  { id: 'value', label: 'Value', width: 120 },
];

describe('DataGrid - Basic Selection Features', () => {
  it('should render without selection features when selectable is false', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={testData} columns={testColumns} selectable={false} />
      </ThemeProvider>
    );

    // No checkboxes should be rendered
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  it('should render with checkbox column when selectable is true', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={testData} columns={testColumns} selectable={true} />
      </ThemeProvider>
    );

    // At least header checkbox should be rendered
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should render with single selection mode', () => {
    const onSelectionChange = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          selectable={true}
          selectionMode='single'
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Component should render without errors
    const container = document.querySelector('.MuiBox-root');
    expect(container).toBeInTheDocument();
  });

  it('should render with multiple selection mode', () => {
    const onSelectionChange = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          selectable={true}
          selectionMode='multiple'
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Header checkbox should exist for multiple selection
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeInTheDocument();
  });

  it('should accept controlled selection state', () => {
    const selectedRows = new Set([0, 1]);
    const onSelectionChange = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          selectable={true}
          selectedRows={selectedRows}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Component should render with controlled state
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('should work with custom rowKey function', () => {
    const onSelectionChange = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          selectable={true}
          rowKey={row => `row-${row.id}`}
          onSelectionChange={onSelectionChange}
        />
      </ThemeProvider>
    );

    // Component should render with custom rowKey
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('should work with selection and sorting enabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={testData} columns={testColumns} selectable={true} sortable={true} />
      </ThemeProvider>
    );

    // Both features should work together - checkbox column exists
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('should work with selection and filtering enabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={testData} columns={testColumns} selectable={true} filterable={true} />
      </ThemeProvider>
    );

    // Both features should work together
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('should work with selection and resizing enabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={testData} columns={testColumns} selectable={true} resizable={true} />
      </ThemeProvider>
    );

    // Both features should work together
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('should work with all features enabled', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataGrid
          data={testData}
          columns={testColumns}
          selectable={true}
          sortable={true}
          filterable={true}
          resizable={true}
          reorderable={true}
          persistLayoutKey='test-grid'
        />
      </ThemeProvider>
    );

    // All features should work together
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    expect(screen.getByTitle('Reset layout to default')).toBeInTheDocument();
  });
});

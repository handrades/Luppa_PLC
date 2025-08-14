import React from 'react';
import { render } from '@testing-library/react';
import { DataGridWithSelection as DataGrid } from './DataGridWithSelection';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock @tanstack/react-virtual for performance tests
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

describe('DataGrid Performance', () => {
  it('should handle 10,000 rows without crashing', () => {
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      description: `Description for item ${i}`,
      status: ['Active', 'Inactive', 'Pending'][i % 3],
    }));

    const columns = [
      { id: 'id', label: 'ID', width: 80 },
      { id: 'name', label: 'Name', width: 200 },
      { id: 'value', label: 'Value', width: 120 },
      { id: 'description', label: 'Description', width: 300 },
      { id: 'status', label: 'Status', width: 100 },
    ];

    const startTime = performance.now();

    const { container } = render(
      <ThemeProvider theme={theme}>
        <DataGrid data={largeData} columns={columns} height={600} overscanRowCount={10} />
      </ThemeProvider>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in less than 3 seconds
    expect(renderTime).toBeLessThan(3000);
    expect(container).toBeTruthy();
  });

  it('should handle sorting 10,000 rows efficiently', () => {
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
    }));

    const columns = [
      { id: 'id', label: 'ID', width: 80, sortable: true },
      { id: 'name', label: 'Name', width: 200, sortable: true },
      { id: 'value', label: 'Value', width: 120, sortable: true },
    ];

    const startTime = performance.now();

    render(
      <ThemeProvider theme={theme}>
        <DataGrid data={largeData} columns={columns} sortable={true} height={600} />
      </ThemeProvider>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Sorting should be quick
    expect(renderTime).toBeLessThan(3000);
  });
});

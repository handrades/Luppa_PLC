import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  SortableColumnHeader, 
  SortState, 
  sortData, 
  updateSortState 
} from './SortableColumnHeader';

const theme = createTheme();

const renderHeader = (props: any = {}) => {
  const defaultProps = {
    columnId: 'test',
    label: 'Test Column',
    sortable: true,
    sortState: [],
    onSort: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <SortableColumnHeader {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('SortableColumnHeader', () => {
  describe('Rendering', () => {
    it('should render column label', () => {
      renderHeader({ label: 'Test Label' });
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should show unsorted icon when no sort applied', () => {
      const { container } = renderHeader();
      expect(container.querySelector('[data-testid="SwapVertIcon"]')).toBeInTheDocument();
    });

    it('should show ascending icon when sorted asc', () => {
      const sortState: SortState[] = [
        { columnId: 'test', direction: 'asc', priority: 0 }
      ];
      const { container } = renderHeader({ sortState });
      expect(container.querySelector('[data-testid="ArrowUpwardIcon"]')).toBeInTheDocument();
    });

    it('should show descending icon when sorted desc', () => {
      const sortState: SortState[] = [
        { columnId: 'test', direction: 'desc', priority: 0 }
      ];
      const { container } = renderHeader({ sortState });
      expect(container.querySelector('[data-testid="ArrowDownwardIcon"]')).toBeInTheDocument();
    });

    it('should show priority badge for multi-column sort', () => {
      const sortState: SortState[] = [
        { columnId: 'test', direction: 'asc', priority: 0 },
        { columnId: 'other', direction: 'desc', priority: 1 }
      ];
      renderHeader({ sortState });
      expect(screen.getByText('1')).toBeInTheDocument(); // Priority badge shows 1-indexed
    });

    it('should not be clickable when sortable is false', () => {
      const onSort = jest.fn();
      const { container } = renderHeader({ sortable: false, onSort });
      
      const header = container.firstChild as HTMLElement;
      fireEvent.click(header);
      
      expect(onSort).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should call onSort when clicked', () => {
      const onSort = jest.fn();
      const { container } = renderHeader({ onSort });
      
      const header = container.firstChild as HTMLElement;
      fireEvent.click(header);
      
      expect(onSort).toHaveBeenCalledWith('test', false);
    });

    it('should pass shift key state to onSort', () => {
      const onSort = jest.fn();
      const { container } = renderHeader({ onSort });
      
      const header = container.firstChild as HTMLElement;
      fireEvent.click(header, { shiftKey: true });
      
      expect(onSort).toHaveBeenCalledWith('test', true);
    });
  });

  describe('sortData function', () => {
    const testData = [
      { id: 1, name: 'Charlie', value: 30 },
      { id: 2, name: 'Alice', value: 10 },
      { id: 3, name: 'Bob', value: 20 },
    ];

    it('should sort data in ascending order', () => {
      const sortState: SortState[] = [
        { columnId: 'name', direction: 'asc', priority: 0 }
      ];
      
      const sorted = sortData(testData, sortState);
      
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('should sort data in descending order', () => {
      const sortState: SortState[] = [
        { columnId: 'value', direction: 'desc', priority: 0 }
      ];
      
      const sorted = sortData(testData, sortState);
      
      expect(sorted[0].value).toBe(30);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(10);
    });

    it('should handle multi-column sort', () => {
      const data = [
        { category: 'A', name: 'Charlie', value: 30 },
        { category: 'B', name: 'Alice', value: 10 },
        { category: 'A', name: 'Bob', value: 20 },
        { category: 'B', name: 'David', value: 15 },
      ];
      
      const sortState: SortState[] = [
        { columnId: 'category', direction: 'asc', priority: 0 },
        { columnId: 'name', direction: 'asc', priority: 1 }
      ];
      
      const sorted = sortData(data, sortState);
      
      expect(sorted[0].name).toBe('Bob'); // Category A, then by name
      expect(sorted[1].name).toBe('Charlie'); // Category A, then by name
      expect(sorted[2].name).toBe('Alice'); // Category B, then by name
      expect(sorted[3].name).toBe('David'); // Category B, then by name
    });

    it('should handle null values', () => {
      const dataWithNulls = [
        { id: 1, name: 'Alice', value: null },
        { id: 2, name: null, value: 20 },
        { id: 3, name: 'Bob', value: 10 },
      ];
      
      const sortState: SortState[] = [
        { columnId: 'name', direction: 'asc', priority: 0 }
      ];
      
      const sorted = sortData(dataWithNulls, sortState);
      
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe(null); // Nulls sorted last in ascending
    });

    it('should use custom getValue function', () => {
      const nestedData = [
        { id: 1, user: { name: 'Charlie' } },
        { id: 2, user: { name: 'Alice' } },
        { id: 3, user: { name: 'Bob' } },
      ];
      
      const sortState: SortState[] = [
        { columnId: 'userName', direction: 'asc', priority: 0 }
      ];
      
      const getValue = (item: any, columnId: string) => {
        if (columnId === 'userName') return item.user.name;
        return item[columnId];
      };
      
      const sorted = sortData(nestedData, sortState, getValue);
      
      expect(sorted[0].user.name).toBe('Alice');
      expect(sorted[1].user.name).toBe('Bob');
      expect(sorted[2].user.name).toBe('Charlie');
    });
  });

  describe('updateSortState function', () => {
    it('should add new sort for single column mode', () => {
      const currentState: SortState[] = [];
      const newState = updateSortState(currentState, 'test', false);
      
      expect(newState).toHaveLength(1);
      expect(newState[0]).toEqual({
        columnId: 'test',
        direction: 'asc',
        priority: 0
      });
    });

    it('should cycle through sort states (asc -> desc -> none)', () => {
      // First click: asc
      let state = updateSortState([], 'test', false);
      expect(state[0].direction).toBe('asc');
      
      // Second click: desc
      state = updateSortState(state, 'test', false);
      expect(state[0].direction).toBe('desc');
      
      // Third click: remove sort
      state = updateSortState(state, 'test', false);
      expect(state).toHaveLength(0);
    });

    it('should replace existing sort in single column mode', () => {
      const currentState: SortState[] = [
        { columnId: 'col1', direction: 'asc', priority: 0 }
      ];
      
      const newState = updateSortState(currentState, 'col2', false);
      
      expect(newState).toHaveLength(1);
      expect(newState[0].columnId).toBe('col2');
    });

    it('should add multiple sorts in multi-column mode', () => {
      let state: SortState[] = [];
      
      // Add first sort
      state = updateSortState(state, 'col1', true);
      expect(state).toHaveLength(1);
      expect(state[0].priority).toBe(0);
      
      // Add second sort
      state = updateSortState(state, 'col2', true);
      expect(state).toHaveLength(2);
      expect(state[1].priority).toBe(1);
      
      // Add third sort
      state = updateSortState(state, 'col3', true);
      expect(state).toHaveLength(3);
      expect(state[2].priority).toBe(2);
    });

    it('should update existing column in multi-column mode', () => {
      const currentState: SortState[] = [
        { columnId: 'col1', direction: 'asc', priority: 0 },
        { columnId: 'col2', direction: 'asc', priority: 1 }
      ];
      
      // Toggle col1 to desc
      const newState = updateSortState(currentState, 'col1', true);
      
      expect(newState[0].direction).toBe('desc');
      expect(newState[0].columnId).toBe('col1');
      expect(newState[1].columnId).toBe('col2');
    });

    it('should remove column and update priorities in multi-column mode', () => {
      const currentState: SortState[] = [
        { columnId: 'col1', direction: 'desc', priority: 0 },
        { columnId: 'col2', direction: 'asc', priority: 1 },
        { columnId: 'col3', direction: 'asc', priority: 2 }
      ];
      
      // Remove col1 (already desc, so next click removes it)
      const newState = updateSortState(currentState, 'col1', true);
      
      expect(newState).toHaveLength(2);
      expect(newState[0].columnId).toBe('col2');
      expect(newState[0].priority).toBe(0); // Priority updated
      expect(newState[1].columnId).toBe('col3');
      expect(newState[1].priority).toBe(1); // Priority updated
    });
  });

  describe('Alignment', () => {
    it('should apply left alignment', () => {
      const { container } = renderHeader({ align: 'left' });
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({ justifyContent: 'flex-start' });
    });

    it('should apply center alignment', () => {
      const { container } = renderHeader({ align: 'center' });
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({ justifyContent: 'center' });
    });

    it('should apply right alignment', () => {
      const { container } = renderHeader({ align: 'right' });
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveStyle({ justifyContent: 'flex-end' });
    });
  });
});
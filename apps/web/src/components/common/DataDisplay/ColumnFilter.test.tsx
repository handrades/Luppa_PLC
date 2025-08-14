import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  ColumnFilter,
  FilterValue,
  filterData,
  filterText,
  filterNumber,
  filterDate,
  getActiveFilterCount,
  getFilterSummary,
} from './ColumnFilter';

const theme = createTheme();

const renderFilter = (props: any = {}) => {
  const defaultProps = {
    columnId: 'test',
    label: 'Test Column',
    type: 'text' as const,
    onFilterChange: jest.fn(),
  };

  return render(
    <ThemeProvider theme={theme}>
      <ColumnFilter {...defaultProps} {...props} />
    </ThemeProvider>
  );
};

describe('ColumnFilter', () => {
  describe('Component Rendering', () => {
    it('should render filter icon button', () => {
      const { container } = renderFilter();
      const filterButton = container.querySelector('[data-testid*="FilterListIcon"]');
      expect(filterButton).toBeInTheDocument();
    });

    it('should open filter popover on click', async () => {
      const { container } = renderFilter();
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Test Column Filter')).toBeInTheDocument();
      });
    });

    it('should show filter icon in primary color when filter is active', () => {
      const filterValue: FilterValue = {
        columnId: 'test',
        type: 'text',
        operator: 'contains',
        value: 'test',
      };
      
      const { container } = renderFilter({ filterValue });
      const filterButton = container.querySelector('button');
      expect(filterButton).toHaveClass('MuiIconButton-colorPrimary');
    });

    it('should be disabled when disabled prop is true', () => {
      const { container } = renderFilter({ disabled: true });
      const filterButton = container.querySelector('button');
      expect(filterButton).toBeDisabled();
    });
  });

  describe('Text Filter', () => {
    it('should render text filter with operator select', async () => {
      const { container } = renderFilter({ type: 'text' });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Operator')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
      });
    });

    it('should call onFilterChange with debounce for text input', async () => {
      jest.useFakeTimers();
      const onFilterChange = jest.fn();
      const { container } = renderFilter({ type: 'text', onFilterChange });
      
      const filterButton = container.querySelector('button');
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const input = await screen.findByRole('textbox', { name: /value/i });
      fireEvent.change(input, { target: { value: 'test' } });
      
      // Should not be called immediately
      expect(onFilterChange).not.toHaveBeenCalled();
      
      // Fast-forward debounce timer
      jest.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(onFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            columnId: 'test',
            type: 'text',
            operator: 'contains',
            value: 'test',
          })
        );
      });
      
      jest.useRealTimers();
    });
  });

  describe('Number Filter', () => {
    it('should render number filter with appropriate operators', async () => {
      const { container } = renderFilter({ type: 'number' });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const operatorSelect = await screen.findByRole('combobox', { name: /operator/i });
      fireEvent.mouseDown(operatorSelect);
      
      await waitFor(() => {
        expect(screen.getByText('Equals')).toBeInTheDocument();
        expect(screen.getByText('Greater than')).toBeInTheDocument();
        expect(screen.getByText('Less than')).toBeInTheDocument();
        expect(screen.getByText('Between')).toBeInTheDocument();
      });
    });

    it('should show two inputs for between operator', async () => {
      const { container } = renderFilter({ type: 'number' });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      // Select between operator
      const operatorSelect = await screen.findByRole('combobox', { name: /operator/i });
      fireEvent.mouseDown(operatorSelect);
      const betweenOption = await screen.findByText('Between');
      fireEvent.click(betweenOption);
      
      await waitFor(() => {
        expect(screen.getByLabelText('From')).toBeInTheDocument();
        expect(screen.getByLabelText('To')).toBeInTheDocument();
      });
    });
  });

  describe('Date Filter', () => {
    it('should render date filter with date picker', async () => {
      const { container } = renderFilter({ type: 'date' });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Operator')).toBeInTheDocument();
      });
    });

    it('should show two date pickers for between operator', async () => {
      const { container } = renderFilter({ type: 'date' });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      // Select between operator
      const operatorSelect = await screen.findByRole('combobox', { name: /operator/i });
      fireEvent.mouseDown(operatorSelect);
      const betweenOption = await screen.findByText('Between');
      fireEvent.click(betweenOption);
      
      await waitFor(() => {
        expect(screen.getByLabelText('From')).toBeInTheDocument();
        expect(screen.getByLabelText('To')).toBeInTheDocument();
      });
    });
  });

  describe('Select Filter', () => {
    it('should render select filter with options', async () => {
      const options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
      ];
      
      const { container } = renderFilter({ type: 'select', options });
      const filterButton = container.querySelector('button');
      
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const valueSelect = await screen.findByRole('combobox', { name: /value/i });
      fireEvent.mouseDown(valueSelect);
      
      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
        expect(screen.getByText('Option 2')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Actions', () => {
    it('should clear filter when clear button is clicked', async () => {
      const onFilterChange = jest.fn();
      const { container } = renderFilter({ onFilterChange });
      
      const filterButton = container.querySelector('button');
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const clearButton = await screen.findByTestId('ClearIcon');
      fireEvent.click(clearButton.parentElement as HTMLElement);
      
      expect(onFilterChange).toHaveBeenCalledWith(null);
    });

    it('should apply filter when apply button is clicked', async () => {
      const onFilterChange = jest.fn();
      const { container } = renderFilter({ type: 'number', onFilterChange });
      
      const filterButton = container.querySelector('button');
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const input = await screen.findByRole('textbox', { name: /value/i });
      fireEvent.change(input, { target: { value: '42' } });
      
      const applyButton = await screen.findByText('Apply');
      fireEvent.click(applyButton);
      
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          columnId: 'test',
          type: 'number',
          operator: 'equals',
          value: '42',
        })
      );
    });

    it('should close popover when cancel is clicked', async () => {
      const { container } = renderFilter();
      
      const filterButton = container.querySelector('button');
      if (filterButton) {
        fireEvent.click(filterButton);
      }
      
      const cancelButton = await screen.findByText('Cancel');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Test Column Filter')).not.toBeInTheDocument();
      });
    });
  });

  describe('filterData function', () => {
    const testData = [
      { id: 1, name: 'Alice', age: 25, status: 'active' },
      { id: 2, name: 'Bob', age: 30, status: 'inactive' },
      { id: 3, name: 'Charlie', age: 35, status: 'active' },
    ];

    it('should filter text data with contains operator', () => {
      const filters: FilterValue[] = [
        {
          columnId: 'name',
          type: 'text',
          operator: 'contains',
          value: 'li',
        },
      ];
      
      const result = filterData(testData, filters);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Charlie');
    });

    it('should filter number data with greater than operator', () => {
      const filters: FilterValue[] = [
        {
          columnId: 'age',
          type: 'number',
          operator: 'greaterThan',
          value: 25,
        },
      ];
      
      const result = filterData(testData, filters);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Bob');
      expect(result[1].name).toBe('Charlie');
    });

    it('should filter with multiple filters', () => {
      const filters: FilterValue[] = [
        {
          columnId: 'status',
          type: 'select',
          operator: 'equals',
          value: 'active',
        },
        {
          columnId: 'age',
          type: 'number',
          operator: 'greaterThan',
          value: 30,
        },
      ];
      
      const result = filterData(testData, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Charlie');
    });

    it('should handle between operator for numbers', () => {
      const filters: FilterValue[] = [
        {
          columnId: 'age',
          type: 'number',
          operator: 'between',
          value: 26,
          value2: 32,
        },
      ];
      
      const result = filterData(testData, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob');
    });

    it('should use custom getValue function', () => {
      const nestedData = [
        { id: 1, user: { name: 'Alice' } },
        { id: 2, user: { name: 'Bob' } },
      ];
      
      const filters: FilterValue[] = [
        {
          columnId: 'userName',
          type: 'text',
          operator: 'equals',
          value: 'alice',
        },
      ];
      
      const getValue = (item: any, columnId: string) => {
        if (columnId === 'userName') return item.user.name;
        return item[columnId];
      };
      
      const result = filterData(nestedData, filters, getValue);
      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe('Alice');
    });
  });

  describe('Utility Functions', () => {
    it('should count active filters correctly', () => {
      const filters: FilterValue[] = [
        { columnId: 'col1', type: 'text', operator: 'contains', value: 'test' },
        { columnId: 'col2', type: 'number', operator: 'equals', value: null },
        { columnId: 'col3', type: 'number', operator: 'between', value: 10, value2: 20 },
      ];
      
      expect(getActiveFilterCount(filters)).toBe(2);
    });

    it('should generate filter summary correctly', () => {
      const textFilter: FilterValue = {
        columnId: 'name',
        type: 'text',
        operator: 'contains',
        value: 'test',
      };
      expect(getFilterSummary(textFilter)).toBe('∋ test');
      
      const numberFilter: FilterValue = {
        columnId: 'age',
        type: 'number',
        operator: 'greaterThan',
        value: 25,
      };
      expect(getFilterSummary(numberFilter)).toBe('> 25');
      
      const betweenFilter: FilterValue = {
        columnId: 'age',
        type: 'number',
        operator: 'between',
        value: 10,
        value2: 20,
      };
      expect(getFilterSummary(betweenFilter)).toBe('10 ↔ 20');
    });
  });
});
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Popover,
  Button,
  Stack,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { styled } from '@mui/material/styles';
import { debounce } from 'lodash';

export type FilterType = 'text' | 'number' | 'date' | 'select';
export type TextOperator = 'contains' | 'startsWith' | 'endsWith' | 'equals';
export type NumberOperator = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between';
export type DateOperator = 'equals' | 'before' | 'after' | 'between';

export interface FilterValue {
  columnId: string;
  type: FilterType;
  operator: TextOperator | NumberOperator | DateOperator;
  value: any;
  value2?: any; // For between operations
}

export interface ColumnFilterProps {
  columnId: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[]; // For select type
  filterValue?: FilterValue;
  onFilterChange: (filter: FilterValue | null) => void;
  disabled?: boolean;
}

const FilterContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  minWidth: 280,
}));

const FilterHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  fontWeight: theme.typography.fontWeightMedium,
}));

export function ColumnFilter({
  columnId,
  label,
  type,
  options = [],
  filterValue,
  onFilterChange,
  disabled = false,
}: ColumnFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [operator, setOperator] = useState<TextOperator | NumberOperator | DateOperator>(
    filterValue?.operator || (type === 'text' ? 'contains' : 'equals')
  );
  const [value, setValue] = useState<any>(filterValue?.value || '');
  const [value2, setValue2] = useState<any>(filterValue?.value2 || '');

  const open = Boolean(anchorEl);

  // Debounced filter update for text inputs
  const debouncedFilterUpdate = useCallback(
    debounce((newFilter: FilterValue | null) => {
      onFilterChange(newFilter);
    }, 300),
    [onFilterChange]
  );

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOperatorChange = (event: SelectChangeEvent) => {
    const newOperator = event.target.value as any;
    setOperator(newOperator);
    if (newOperator !== 'between') {
      setValue2('');
    }
  };

  const handleValueChange = (newValue: any, isSecondValue = false) => {
    if (isSecondValue) {
      setValue2(newValue);
    } else {
      setValue(newValue);
    }

    // Build filter object
    const filter: FilterValue = {
      columnId,
      type,
      operator,
      value: isSecondValue ? value : newValue,
      value2: operator === 'between' ? (isSecondValue ? newValue : value2) : undefined,
    };

    // Apply filter
    if (type === 'text') {
      debouncedFilterUpdate(filter);
    } else {
      onFilterChange(filter);
    }
  };

  const handleClear = () => {
    setValue('');
    setValue2('');
    onFilterChange(null);
    handleClose();
  };

  const handleApply = () => {
    if (!value && value !== 0) {
      onFilterChange(null);
    } else {
      const filter: FilterValue = {
        columnId,
        type,
        operator,
        value,
        value2: operator === 'between' ? value2 : undefined,
      };
      onFilterChange(filter);
    }
    handleClose();
  };

  const renderOperatorSelect = () => {
    let operators: { value: string; label: string }[] = [];

    switch (type) {
      case 'text':
        operators = [
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' },
          { value: 'equals', label: 'Equals' },
        ];
        break;
      case 'number':
        operators = [
          { value: 'equals', label: 'Equals' },
          { value: 'notEquals', label: 'Not equals' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'between', label: 'Between' },
        ];
        break;
      case 'date':
        operators = [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' },
        ];
        break;
      default:
        return null;
    }

    return (
      <FormControl fullWidth size="small" margin="dense">
        <InputLabel>Operator</InputLabel>
        <Select value={operator} onChange={handleOperatorChange} label="Operator">
          {operators.map((op) => (
            <MenuItem key={op.value} value={op.value}>
              {op.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderValueInput = () => {
    switch (type) {
      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            margin="dense"
            label="Value"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            autoFocus
          />
        );

      case 'number':
        return (
          <>
            <TextField
              fullWidth
              size="small"
              margin="dense"
              label={operator === 'between' ? 'From' : 'Value'}
              type="number"
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              autoFocus
            />
            {operator === 'between' && (
              <TextField
                fullWidth
                size="small"
                margin="dense"
                label="To"
                type="number"
                value={value2}
                onChange={(e) => handleValueChange(e.target.value, true)}
              />
            )}
          </>
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={operator === 'between' ? 'From' : 'Date'}
              value={value || null}
              onChange={(newValue) => handleValueChange(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  margin: 'dense',
                },
              }}
            />
            {operator === 'between' && (
              <DatePicker
                label="To"
                value={value2 || null}
                onChange={(newValue) => handleValueChange(newValue, true)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    margin: 'dense',
                  },
                }}
              />
            )}
          </LocalizationProvider>
        );

      case 'select':
        return (
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Value</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleValueChange(e.target.value)}
              label="Value"
              multiple={false}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const hasFilter = filterValue && (filterValue.value || filterValue.value === 0);

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        disabled={disabled}
        color={hasFilter ? 'primary' : 'default'}
      >
        <FilterListIcon fontSize="small" />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <FilterContainer>
          <FilterHeader>
            <Box>{label} Filter</Box>
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </FilterHeader>

          {type !== 'select' && renderOperatorSelect()}
          {renderValueInput()}

          <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
            <Button size="small" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleApply}>
              Apply
            </Button>
          </Stack>
        </FilterContainer>
      </Popover>
    </>
  );
}

// Filter utility functions
export function filterData<T>(
  data: T[],
  filters: FilterValue[],
  getValueFn?: (item: T, columnId: string) => any
): T[] {
  if (filters.length === 0) return data;

  return data.filter((item) => {
    return filters.every((filter) => {
      const getValue = getValueFn || ((item: any, col: string) => item[col]);
      const itemValue = getValue(item, filter.columnId);

      switch (filter.type) {
        case 'text':
          return filterText(itemValue, filter.operator as TextOperator, filter.value);
        case 'number':
          return filterNumber(
            itemValue,
            filter.operator as NumberOperator,
            filter.value,
            filter.value2
          );
        case 'date':
          return filterDate(
            itemValue,
            filter.operator as DateOperator,
            filter.value,
            filter.value2
          );
        case 'select':
          return itemValue === filter.value;
        default:
          return true;
      }
    });
  });
}

export function filterText(value: any, operator: TextOperator, filterValue: string): boolean {
  if (value == null) return false;
  const textValue = String(value).toLowerCase();
  const searchValue = String(filterValue).toLowerCase();

  switch (operator) {
    case 'contains':
      return textValue.includes(searchValue);
    case 'startsWith':
      return textValue.startsWith(searchValue);
    case 'endsWith':
      return textValue.endsWith(searchValue);
    case 'equals':
      return textValue === searchValue;
    default:
      return true;
  }
}

export function filterNumber(
  value: any,
  operator: NumberOperator,
  filterValue: any,
  filterValue2?: any
): boolean {
  if (value == null) return false;
  const numValue = Number(value);
  const compareValue = Number(filterValue);
  const compareValue2 = filterValue2 != null ? Number(filterValue2) : null;

  switch (operator) {
    case 'equals':
      return numValue === compareValue;
    case 'notEquals':
      return numValue !== compareValue;
    case 'greaterThan':
      return numValue > compareValue;
    case 'lessThan':
      return numValue < compareValue;
    case 'between':
      return compareValue2 != null && numValue >= compareValue && numValue <= compareValue2;
    default:
      return true;
  }
}

export function filterDate(
  value: any,
  operator: DateOperator,
  filterValue: any,
  filterValue2?: any
): boolean {
  if (value == null) return false;
  const dateValue = new Date(value);
  const compareDate = new Date(filterValue);
  const compareDate2 = filterValue2 ? new Date(filterValue2) : null;

  switch (operator) {
    case 'equals':
      return dateValue.toDateString() === compareDate.toDateString();
    case 'before':
      return dateValue < compareDate;
    case 'after':
      return dateValue > compareDate;
    case 'between':
      return compareDate2 != null && dateValue >= compareDate && dateValue <= compareDate2;
    default:
      return true;
  }
}

export function getActiveFilterCount(filters: FilterValue[]): number {
  return filters.filter((f) => f.value != null || f.value2 != null).length;
}

export function getFilterSummary(filter: FilterValue): string {
  const { type, operator, value, value2 } = filter;
  
  if (type === 'select') {
    return `= ${value}`;
  }
  
  const opSymbol = {
    contains: '∋',
    startsWith: '^',
    endsWith: '$',
    equals: '=',
    notEquals: '≠',
    greaterThan: '>',
    lessThan: '<',
    before: '<',
    after: '>',
    between: '↔',
  }[operator] || operator;
  
  if (operator === 'between' && value2 != null) {
    return `${value} ${opSymbol} ${value2}`;
  }
  
  return `${opSymbol} ${value}`;
}
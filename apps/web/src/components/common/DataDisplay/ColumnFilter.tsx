import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { styled } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { debounce } from 'lodash';

export type FilterType = 'text' | 'number' | 'date' | 'select';
export type TextOperator = 'contains' | 'startsWith' | 'endsWith' | 'equals';
export type NumberOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between';
export type DateOperator =
  | 'equals'
  | 'before'
  | 'after'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between';

export interface FilterValue {
  columnId: string;
  type: FilterType;
  operator: TextOperator | NumberOperator | DateOperator;
  value: unknown;
  value2?: unknown; // For between operations
}

export interface ColumnFilterProps {
  columnId: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[]; // For select type
  filterValue?: FilterValue;
  onFilterChange: (_filter: FilterValue | null) => void;
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
  const [value, setValue] = useState<unknown>(filterValue?.value || '');
  const [value2, setValue2] = useState<unknown>(filterValue?.value2 || '');

  const open = Boolean(anchorEl);

  // Debounced filter update for text inputs
  const debouncedFilterUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    // Cancel any existing debounced function
    if (debouncedFilterUpdateRef.current) {
      debouncedFilterUpdateRef.current.cancel();
    }

    // Create new debounced function
    debouncedFilterUpdateRef.current = debounce((newFilter: FilterValue | null) => {
      onFilterChange(newFilter);
    }, 300);

    // Cleanup on unmount or when onFilterChange changes
    return () => {
      if (debouncedFilterUpdateRef.current) {
        debouncedFilterUpdateRef.current.cancel();
      }
    };
  }, [onFilterChange]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOperatorChange = (event: SelectChangeEvent) => {
    const newOperator = event.target.value as TextOperator | NumberOperator | DateOperator;
    setOperator(newOperator);
    if (newOperator !== 'between') {
      setValue2('');
    }
  };

  const handleValueChange = (newValue: unknown, isSecondValue = false) => {
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
      if (debouncedFilterUpdateRef.current) {
        debouncedFilterUpdateRef.current(filter);
      }
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
          { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
          { value: 'lessThanOrEqual', label: 'Less than or equal' },
          { value: 'between', label: 'Between' },
        ];
        break;
      case 'date':
        operators = [
          { value: 'equals', label: 'Equals' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'greaterThan', label: 'Greater than' },
          { value: 'lessThan', label: 'Less than' },
          { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
          { value: 'lessThanOrEqual', label: 'Less than or equal' },
          { value: 'between', label: 'Between' },
        ];
        break;
      default:
        return null;
    }

    return (
      <FormControl fullWidth size='small' margin='dense'>
        <InputLabel>Operator</InputLabel>
        <Select value={operator} onChange={handleOperatorChange} label='Operator'>
          {operators.map(op => (
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
            size='small'
            margin='dense'
            label='Value'
            value={value}
            onChange={e => handleValueChange(e.target.value)}
            autoFocus
          />
        );

      case 'number':
        return (
          <>
            <TextField
              fullWidth
              size='small'
              margin='dense'
              label={operator === 'between' ? 'From' : 'Value'}
              type='number'
              value={value}
              onChange={e => handleValueChange(e.target.value)}
              autoFocus
            />
            {operator === 'between' && (
              <TextField
                fullWidth
                size='small'
                margin='dense'
                label='To'
                type='number'
                value={value2}
                onChange={e => handleValueChange(e.target.value, true)}
              />
            )}
          </>
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={operator === 'between' ? 'From' : 'Date'}
              value={
                value instanceof Date
                  ? value
                  : value
                    ? (() => {
                        const date = new Date(value as string);
                        return isNaN(date.getTime()) ? null : date;
                      })()
                    : null
              }
              onChange={newValue => handleValueChange(newValue)}
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
                label='To'
                value={
                  value2 instanceof Date
                    ? value2
                    : value2
                      ? (() => {
                          const date = new Date(value2 as string);
                          return isNaN(date.getTime()) ? null : date;
                        })()
                      : null
                }
                onChange={newValue => handleValueChange(newValue, true)}
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
          <FormControl fullWidth size='small' margin='dense'>
            <InputLabel>Value</InputLabel>
            <Select
              value={
                typeof value === 'string'
                  ? value
                  : typeof value === 'number'
                    ? String(value)
                    : Array.isArray(value)
                      ? value.join(',')
                      : ''
              }
              onChange={e => handleValueChange(e.target.value)}
              label='Value'
              multiple={false}
            >
              {options.map(option => (
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
        size='small'
        onClick={handleClick}
        disabled={disabled}
        color={hasFilter ? 'primary' : 'default'}
      >
        <FilterListIcon fontSize='small' />
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
            <IconButton size='small' onClick={handleClear}>
              <ClearIcon fontSize='small' />
            </IconButton>
          </FilterHeader>

          {type !== 'select' && renderOperatorSelect()}
          {renderValueInput()}

          <Stack direction='row' spacing={1} mt={2} justifyContent='flex-end'>
            <Button size='small' onClick={handleClose}>
              Cancel
            </Button>
            <Button size='small' variant='contained' onClick={handleApply}>
              Apply
            </Button>
          </Stack>
        </FilterContainer>
      </Popover>
    </>
  );
}

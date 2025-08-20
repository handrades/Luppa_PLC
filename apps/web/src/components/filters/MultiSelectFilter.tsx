/**
 * Multi-Select Filter Component
 * Story 5.1: Advanced Filtering System
 *
 * Reusable component for multi-value selection with search,
 * virtualization, and accessibility features.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { FixedSizeList as List } from 'react-window';

import type { FilterOption, MultiSelectFilterProps } from '../../types/advanced-filters';

/**
 * Props for virtualized list item
 */
interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    options: FilterOption[];
    selectedValues: Set<string>;
    onToggle: (value: string) => void;
  };
}

/**
 * Individual list item component for virtualization
 */
const ListItem: React.FC<ListItemProps> = ({ index, style, data }) => {
  const { options, selectedValues, onToggle } = data;
  const option = options[index];
  const isSelected = selectedValues.has(option.value);

  return (
    <div style={style}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 0.5,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        onClick={() => onToggle(option.value)}
        role='option'
        aria-selected={isSelected}
      >
        <Checkbox checked={isSelected} size='small' sx={{ mr: 1 }} tabIndex={-1} />
        <ListItemText
          primary={option.label}
          secondary={option.count > 0 ? `${option.count} items` : undefined}
          sx={{ flex: 1 }}
        />
      </Box>
    </div>
  );
};

/**
 * Multi-select filter component with search and virtualization
 */
export const MultiSelectFilter = <T extends string>({
  label,
  options,
  values,
  onChange,
  loading = false,
  searchable = false,
  maxHeight = 300,
  virtualizeThreshold = 100,
  helperText,
  error,
}: MultiSelectFilterProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;

    const term = searchTerm.toLowerCase();
    return options.filter(
      option =>
        option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  // Convert values to Set for efficient lookup
  const selectedValues = useMemo(() => new Set(values.map(v => v as string)), [values]);

  // Handle value toggle
  const handleToggle = useCallback(
    (value: string) => {
      const newValues = [...values];
      const index = newValues.findIndex(v => v === value);

      if (index >= 0) {
        newValues.splice(index, 1);
      } else {
        newValues.push(value as T);
      }

      onChange(newValues);
    },
    [values, onChange]
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedValues.size === filteredOptions.length) {
      // Deselect all visible options
      const visibleValues = new Set(filteredOptions.map(opt => opt.value));
      const newValues = values.filter(v => !visibleValues.has(v));
      onChange(newValues);
    } else {
      // Select all visible options
      const allVisibleValues = new Set([
        ...values,
        ...filteredOptions.map(opt => opt.value).filter((v): v is T => typeof v === 'string'),
      ]);
      onChange(Array.from(allVisibleValues));
    }
  }, [selectedValues.size, filteredOptions, values, onChange]);

  // Calculate selection state
  const selectedCount = values.length;
  const visibleSelectedCount = filteredOptions.filter(opt => selectedValues.has(opt.value)).length;
  const isAllSelected =
    visibleSelectedCount === filteredOptions.length && filteredOptions.length > 0;
  const isPartiallySelected =
    visibleSelectedCount > 0 && visibleSelectedCount < filteredOptions.length;

  return (
    <FormControl fullWidth error={!!error}>
      <FormLabel
        sx={{
          fontSize: '0.875rem',
          fontWeight: 500,
          mb: 1,
          color: error ? 'error.main' : 'text.primary',
        }}
      >
        {label}
        {selectedCount > 0 && (
          <Typography component='span' variant='body2' sx={{ ml: 1, color: 'primary.main' }}>
            ({selectedCount} selected)
          </Typography>
        )}
      </FormLabel>

      {/* Search input */}
      {searchable && (
        <TextField
          size='small'
          placeholder={`Search ${label.toLowerCase()}...`}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ mb: 1 }}
          disabled={loading}
        />
      )}

      {/* Selection area */}
      <Paper
        variant='outlined'
        sx={{
          minHeight: 40,
          maxHeight: maxHeight,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 60,
              gap: 1,
            }}
          >
            <CircularProgress size={16} />
            <Typography variant='body2' color='textSecondary'>
              Loading {label.toLowerCase()}...
            </Typography>
          </Box>
        ) : filteredOptions.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 60,
              color: 'text.secondary',
            }}
          >
            <Typography variant='body2'>
              {searchTerm
                ? `No ${label.toLowerCase()} found matching "${searchTerm}"`
                : `No ${label.toLowerCase()} available`}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Select All option */}
            {filteredOptions.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 0.5,
                  cursor: 'pointer',
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'action.selected',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={handleSelectAll}
                role='option'
              >
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  size='small'
                  sx={{ mr: 1 }}
                />
                <ListItemText
                  primary={
                    <Typography variant='body2' fontWeight={500}>
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                      {searchTerm && ` (${filteredOptions.length} visible)`}
                    </Typography>
                  }
                />
              </Box>
            )}

            {/* Option list - virtualized if needed */}
            {filteredOptions.length > virtualizeThreshold ? (
              <List
                width='100%'
                height={Math.min(maxHeight - 50, filteredOptions.length * 40)}
                itemCount={filteredOptions.length}
                itemSize={40}
                itemData={{
                  options: filteredOptions,
                  selectedValues,
                  onToggle: handleToggle,
                }}
              >
                {ListItem}
              </List>
            ) : (
              <Box>
                {filteredOptions.map(option => {
                  const isSelected = selectedValues.has(option.value);

                  return (
                    <Box
                      key={option.value}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => handleToggle(option.value)}
                      role='option'
                      aria-selected={isSelected}
                    >
                      <Checkbox checked={isSelected} size='small' sx={{ mr: 1 }} tabIndex={-1} />
                      <ListItemText
                        primary={option.label}
                        secondary={option.count > 0 ? `${option.count} items` : undefined}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Selected chips display */}
      {selectedCount > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {values.slice(0, 5).map(value => {
            const option = options.find(opt => opt.value === value);
            return (
              <Chip
                key={value}
                label={option?.label || value}
                size='small'
                variant='outlined'
                onDelete={() => handleToggle(value as string)}
                sx={{ fontSize: '0.75rem' }}
              />
            );
          })}
          {selectedCount > 5 && (
            <Chip
              label={`+${selectedCount - 5} more`}
              size='small'
              variant='outlined'
              sx={{ fontSize: '0.75rem', opacity: 0.7 }}
            />
          )}
        </Box>
      )}

      {/* Helper text or error message */}
      {(helperText || error) && (
        <FormHelperText sx={{ mt: 1 }}>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

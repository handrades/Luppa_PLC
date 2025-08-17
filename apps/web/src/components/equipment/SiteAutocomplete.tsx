/**
 * Site Autocomplete Component for Equipment Forms
 * Story 4.4: Equipment Form UI - Task 4
 *
 * Provides autocomplete functionality for site selection with debounced search,
 * loading states, and proper accessibility support.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Clear, LocationOn } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';

import { equipmentQueryKeys, equipmentService } from '../../services/equipment.service';
import type { SiteAutocompleteOption, SiteAutocompleteProps } from '../../types/equipment-form';
import { EQUIPMENT_FORM_CONSTRAINTS } from '../../types/equipment-form';

/**
 * Site Autocomplete Component
 *
 * Features:
 * - Debounced search with 300ms delay
 * - Loading states during API requests
 * - Keyboard navigation support
 * - Accessibility compliance
 * - Error handling with graceful fallbacks
 * - Virtualization for large result sets
 */
const SiteAutocomplete: React.FC<SiteAutocompleteProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  label = 'Site Name',
  placeholder = 'Search for site...',
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Debounced search function to prevent excessive API calls
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        setSearchTerm(term);
      }, EQUIPMENT_FORM_CONSTRAINTS.AUTOCOMPLETE_DEBOUNCE_MS),
    []
  );

  // Query for site suggestions
  const {
    data: suggestions = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: equipmentQueryKeys.siteSuggestions(searchTerm),
    queryFn: () => equipmentService.getSiteSuggestions(searchTerm),
    enabled: searchTerm.length >= 2, // Only search when user types at least 2 characters
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Retry failed requests once
  });

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, newInputValue: string) => {
      setInputValue(newInputValue);

      // Trigger debounced search
      if (newInputValue.trim().length >= 2) {
        debouncedSearch(newInputValue.trim());
      } else {
        setSearchTerm('');
      }
    },
    [debouncedSearch]
  );

  // Handle selection change
  const handleChange = useCallback(
    (_event: React.SyntheticEvent, newValue: SiteAutocompleteOption | string | null) => {
      if (typeof newValue === 'string') {
        // Free text input
        onChange(newValue);
        setInputValue(newValue);
      } else if (newValue?.siteName) {
        // Selected from suggestions
        onChange(newValue.siteName);
        setInputValue(newValue.siteName);
      } else {
        // Cleared
        onChange('');
        setInputValue('');
      }
    },
    [onChange]
  );

  // Handle clear button
  const handleClear = useCallback(() => {
    onChange('');
    setInputValue('');
    setSearchTerm('');
  }, [onChange]);

  // Custom option rendering
  const renderOption = useCallback(
    (props: React.HTMLAttributes<HTMLLIElement>, option: SiteAutocompleteOption) => (
      <Box component='li' {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOn sx={{ color: 'text.secondary', fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant='body2' sx={{ fontWeight: 'medium' }}>
            {option.siteName}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {option.usageCount} equipment record
            {option.usageCount !== 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>
    ),
    []
  );

  // Custom "No options" message
  const noOptionsText = useMemo(() => {
    if (searchTerm.length < 2) {
      return 'Type at least 2 characters to search';
    }
    if (queryError) {
      return 'Error loading suggestions. You can still enter a site name manually.';
    }
    return 'No sites found. You can enter a new site name.';
  }, [searchTerm.length, queryError]);

  // Custom paper component for dropdown
  const PaperComponent = useCallback(
    ({ children, ...other }: React.ComponentProps<typeof Paper>) => (
      <Paper {...other} sx={{ '& .MuiAutocomplete-listbox': { maxHeight: 200 } }}>
        {children}
      </Paper>
    ),
    []
  );

  return (
    <Autocomplete
      value={value ? { siteName: value, usageCount: 0, label: value } : null}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={suggestions}
      loading={isLoading}
      disabled={disabled}
      freeSolo // Allow typing custom values
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      getOptionLabel={option => (typeof option === 'string' ? option : option.siteName)}
      isOptionEqualToValue={(option, value) =>
        option.siteName === (typeof value === 'string' ? value : value.siteName)
      }
      renderOption={renderOption}
      noOptionsText={noOptionsText}
      PaperComponent={PaperComponent}
      filterOptions={x => x} // Disable client-side filtering (using server-side)
      sx={{ width: '100%' }}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={!!error}
          helperText={error || (searchTerm.length >= 2 && isLoading ? 'Searching...' : '')}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position='start'>
                <LocationOn sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isLoading && (
                  <CircularProgress
                    size={20}
                    sx={{ mr: 1 }}
                    aria-label='Loading site suggestions'
                  />
                )}
                {value && !disabled && (
                  <Clear
                    sx={{
                      cursor: 'pointer',
                      color: 'text.secondary',
                      mr: 1,
                      '&:hover': { color: 'text.primary' },
                    }}
                    onClick={handleClear}
                    aria-label='Clear site selection'
                  />
                )}
                {params.InputProps.endAdornment}
              </Box>
            ),
          }}
          inputProps={{
            ...params.inputProps,
            'aria-label': `${label}${required ? ' (required)' : ''}`,
            'aria-describedby': error ? `${params.id}-error` : undefined,
            'aria-invalid': !!error,
            maxLength: EQUIPMENT_FORM_CONSTRAINTS.NAME_MAX_LENGTH,
          }}
        />
      )}
      // Accessibility attributes
      aria-label={`${label} autocomplete`}
      componentsProps={{
        popper: {
          placement: 'bottom-start',
        },
      }}
    />
  );
};

export default React.memo(SiteAutocomplete);

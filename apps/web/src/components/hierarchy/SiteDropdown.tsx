/**
 * Site Dropdown Component
 * Autocomplete dropdown for site selection with search capability
 * Story 4.5: Site Hierarchy Management
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Factory as FactoryIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { useHierarchyStore } from '../../stores/hierarchy.store';
import { CreateSiteDto, Site } from '../../types/hierarchy';

/**
 * Props for the SiteDropdown component
 */
interface SiteDropdownProps {
  /** Currently selected site ID */
  value?: string | null;
  /** Callback when site selection changes */
  onChange: (siteId: string | null, site: Site | null) => void;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text to display */
  helperText?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Custom label for the field */
  label?: string;
  /** Whether to show equipment count in options */
  showCounts?: boolean;
  /** Whether to allow creating new sites */
  allowCreate?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Full width */
  fullWidth?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Custom filter function */
  filterOptions?: (options: Site[], inputValue: string) => Site[];
  /** Maximum number of options to display */
  maxOptions?: number;
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Site creation dialog props
 */
interface SiteCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreateSiteDto) => Promise<void>;
  loading?: boolean;
}

/**
 * Site creation dialog component
 */
const SiteCreateDialog: React.FC<SiteCreateDialogProps> = ({
  open,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [siteName, setSiteName] = useState('');
  const [nameError, setNameError] = useState('');
  const { validateSiteUniqueness } = useHierarchyStore();

  const handleSubmit = async () => {
    if (!siteName.trim()) {
      setNameError('Site name is required');
      return;
    }

    try {
      // Validate uniqueness
      const isUnique = await validateSiteUniqueness(siteName.trim());
      if (!isUnique) {
        setNameError('Site name already exists');
        return;
      }

      await onConfirm({ name: siteName.trim() });
      setSiteName('');
      setNameError('');
    } catch {
      setNameError('Failed to create site');
    }
  };

  const handleClose = () => {
    setSiteName('');
    setNameError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Create New Site</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin='dense'
          label='Site Name'
          fullWidth
          variant='outlined'
          value={siteName}
          onChange={e => {
            setSiteName(e.target.value);
            setNameError('');
          }}
          error={!!nameError}
          helperText={nameError || 'Enter a unique name for the new site'}
          disabled={loading}
          inputProps={{
            maxLength: 100,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          disabled={loading || !siteName.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Site'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Site option renderer for autocomplete
 */
const SiteOption: React.FC<{
  site: Site;
  showCounts: boolean;
  inputValue: string;
}> = ({ site, showCounts, inputValue }) => {
  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      <FactoryIcon color='action' fontSize='small' />
      <Box sx={{ flex: 1 }}>
        <Typography variant='body2' component='div'>
          {highlightText(site.name, inputValue)}
        </Typography>
        {showCounts && (
          <Typography variant='caption' color='text.secondary'>
            {site.cellCount || 0} cells, {site.equipmentCount || 0} equipment
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * Site Dropdown Component
 */
export const SiteDropdown: React.FC<SiteDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  placeholder = 'Select a site...',
  label = 'Site',
  showCounts = true,
  allowCreate = true,
  size = 'medium',
  fullWidth = true,
  autoFocus = false,
  filterOptions,
  maxOptions = 50,
  onSearchChange,
  'data-testid': testId,
}) => {
  // Local state
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [localOptions, setLocalOptions] = useState<Site[]>([]);

  // Store hooks
  const {
    sites,
    siteSuggestions,
    isLoadingSites,
    isCreatingSite,
    error: storeError,
    fetchSites,
    fetchSiteSuggestions,
    createSite,
  } = useHierarchyStore();

  // Debounced search query
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Find selected site
  const selectedSite = useMemo(() => {
    if (!value) return null;
    return sites.find(site => site.id === value) || null;
  }, [value, sites]);

  // Load sites on mount
  useEffect(() => {
    if (!sites || sites.length === 0) {
      fetchSites();
    }
  }, [sites, fetchSites]);

  // Search for site suggestions when input changes
  useEffect(() => {
    if (debouncedInputValue && open) {
      fetchSiteSuggestions(debouncedInputValue);
      onSearchChange?.(debouncedInputValue);
    }
  }, [debouncedInputValue, open, fetchSiteSuggestions, onSearchChange]);

  // Update local options based on search
  useEffect(() => {
    let options: Site[] = [];

    if (debouncedInputValue && siteSuggestions && siteSuggestions.length > 0) {
      // Use search suggestions when actively searching
      options = siteSuggestions.map(suggestion => ({
        id: suggestion.id,
        name: suggestion.name,
        cellCount: suggestion.cellCount,
        equipmentCount: 0, // Will be loaded separately if needed
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
      }));
    } else {
      // Use all sites when not searching
      options = sites || [];
    }

    // Apply custom filter if provided
    if (filterOptions) {
      options = filterOptions(options, inputValue);
    } else if (inputValue) {
      // Default filtering by name
      const query = inputValue.toLowerCase();
      options = options.filter(site => site.name.toLowerCase().includes(query));
    }

    // Limit options
    options = options.slice(0, maxOptions);

    setLocalOptions(options);
  }, [sites, siteSuggestions, debouncedInputValue, inputValue, filterOptions, maxOptions]);

  // Handle selection change
  const handleChange = useCallback(
    (_event: unknown, newValue: Site | null) => {
      onChange(newValue?.id || null, newValue);
    },
    [onChange]
  );

  // Handle input change
  const handleInputChange = useCallback((_event: unknown, newInputValue: string) => {
    setInputValue(newInputValue);
  }, []);

  // Handle create site
  const handleCreateSite = useCallback(
    async (data: CreateSiteDto) => {
      const newSite = await createSite(data);
      setCreateDialogOpen(false);
      onChange(newSite.id, newSite);
    },
    [createSite, onChange]
  );

  // Render loading skeleton
  if (isLoadingSites && (!sites || sites.length === 0)) {
    return (
      <Box sx={{ width: fullWidth ? '100%' : 200 }}>
        <Typography variant='body2' sx={{ mb: 1 }}>
          {label}
        </Typography>
        <Skeleton variant='rectangular' height={size === 'small' ? 40 : 56} />
      </Box>
    );
  }

  // Show error alert if there's a critical error
  if (storeError && (!sites || sites.length === 0)) {
    return (
      <Box sx={{ width: fullWidth ? '100%' : 200 }}>
        <Alert severity='error' sx={{ mb: 1 }}>
          Failed to load sites: {storeError.message}
        </Alert>
        <Button
          variant='outlined'
          onClick={() => fetchSites()}
          startIcon={<SearchIcon />}
          fullWidth={fullWidth}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Autocomplete
        value={selectedSite}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={localOptions}
        getOptionLabel={option => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isLoadingSites && debouncedInputValue !== ''}
        disabled={disabled}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        size={size}
        fullWidth={fullWidth}
        autoHighlight
        clearOnBlur={false}
        selectOnFocus
        handleHomeEndKeys
        data-testid={testId}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={selectedSite ? selectedSite.name : placeholder}
            required={required}
            error={!!error}
            helperText={error || helperText}
            autoFocus={autoFocus}
            InputProps={{
              ...params.InputProps,
              startAdornment: <LocationIcon color='action' sx={{ mr: 1 }} />,
              endAdornment: (
                <>
                  {isLoadingSites && debouncedInputValue !== '' ? (
                    <CircularProgress color='inherit' size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option, state) => {
          // Check if this is the last option and we should show create button
          const isLastOption = state.index === localOptions.length - 1;
          return (
            <>
              <li {...props} key={option.id}>
                <SiteOption site={option} showCounts={showCounts} inputValue={inputValue} />
              </li>
              {isLastOption && allowCreate && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderTop: 1,
                    borderColor: 'divider',
                    mt: 1,
                  }}
                >
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<AddIcon />}
                    onClick={e => {
                      e.stopPropagation();
                      setCreateDialogOpen(true);
                      setOpen(false);
                    }}
                    fullWidth
                  >
                    Create New Site
                  </Button>
                </Box>
              )}
            </>
          );
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant='outlined'
              label={option.name}
              size={size}
              {...getTagProps({ index })}
              key={option.id}
            />
          ))
        }
        noOptionsText={
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              {inputValue ? `No sites found for "${inputValue}"` : 'No sites available'}
            </Typography>
            {allowCreate && inputValue && (
              <Button
                variant='outlined'
                size='small'
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 1 }}
              >
                Create "{inputValue}" site
              </Button>
            )}
          </Box>
        }
        filterOptions={options => options} // We handle filtering manually
      />

      {/* Helper text for counts */}
      {selectedSite && showCounts && !error && !helperText && (
        <FormHelperText>
          {selectedSite.cellCount || 0} cells, {selectedSite.equipmentCount || 0} equipment
        </FormHelperText>
      )}

      {/* Create site dialog */}
      <SiteCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onConfirm={handleCreateSite}
        loading={isCreatingSite}
      />
    </>
  );
};

/**
 * Memoized version for performance
 */
export const MemoizedSiteDropdown = React.memo(SiteDropdown);

/**
 * Default export
 */
export default SiteDropdown;

/**
 * Cell Selection Component
 * Two-field component for cell type dropdown and cell ID autocomplete
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
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, GridView as CellIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { useHierarchyStore } from '../../stores/hierarchy.store';
import { Cell, CreateCellDto } from '../../types/hierarchy';

/**
 * Cell type enum - represents different types of production cells
 */
export enum CellType {
  ASSEMBLY_LINE = 'Assembly Line',
  PRODUCTION_CELL = 'Production Cell',
  TESTING_STATION = 'Testing Station',
  PACKAGING_LINE = 'Packaging Line',
  QUALITY_CONTROL = 'Quality Control',
  MAINTENANCE_BAY = 'Maintenance Bay',
  STORAGE_AREA = 'Storage Area',
  OTHER = 'Other',
}

/**
 * Props for the CellSelector component
 */
interface CellSelectorProps {
  /** Currently selected site ID (required for cell selection) */
  siteId: string | null;
  /** Currently selected cell ID */
  value?: string | null;
  /** Callback when cell selection changes */
  onChange: (cellId: string | null, cell: Cell | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text to display */
  helperText?: string;
  /** Whether to show equipment count in options */
  showCounts?: boolean;
  /** Whether to allow creating new cells */
  allowCreate?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Full width */
  fullWidth?: boolean;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Cell creation dialog props
 */
interface CellCreateDialogProps {
  open: boolean;
  siteId: string;
  siteName: string;
  initialCellType?: CellType;
  initialLineNumber?: string;
  onClose: () => void;
  onConfirm: (data: CreateCellDto) => Promise<void>;
  loading?: boolean;
}

/**
 * Cell creation dialog component
 */
const CellCreateDialog: React.FC<CellCreateDialogProps> = ({
  open,
  siteId,
  siteName,
  initialCellType,
  initialLineNumber,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [cellName, setCellName] = useState('');
  const [lineNumber, setLineNumber] = useState(initialLineNumber || '');
  const [nameError, setNameError] = useState('');
  const [lineError, setLineError] = useState('');
  const { validateCellLineNumber } = useHierarchyStore();

  const handleSubmit = async () => {
    let hasErrors = false;

    if (!cellName.trim()) {
      setNameError('Cell name is required');
      hasErrors = true;
    }

    if (!lineNumber.trim()) {
      setLineError('Line number is required');
      hasErrors = true;
    }

    if (hasErrors) return;

    try {
      // Validate line number uniqueness
      const isUnique = await validateCellLineNumber(siteId, lineNumber.trim());
      if (!isUnique) {
        setLineError('Line number already exists in this site');
        return;
      }

      await onConfirm({
        siteId,
        name: cellName.trim(),
        lineNumber: lineNumber.trim().toUpperCase(),
      });

      // Reset form
      setCellName('');
      setLineNumber('');
      setNameError('');
      setLineError('');
    } catch {
      setNameError('Failed to create cell');
    }
  };

  const handleClose = () => {
    setCellName('');
    setLineNumber('');
    setNameError('');
    setLineError('');
    onClose();
  };

  // Auto-generate cell name based on type and line number
  useEffect(() => {
    if (initialCellType && lineNumber) {
      const baseName = initialCellType === CellType.OTHER ? 'Cell' : initialCellType;
      setCellName(`${baseName} ${lineNumber}`);
    }
  }, [initialCellType, lineNumber]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Create New Cell in {siteName}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label='Cell Name'
              fullWidth
              variant='outlined'
              value={cellName}
              onChange={e => {
                setCellName(e.target.value);
                setNameError('');
              }}
              error={!!nameError}
              helperText={nameError || 'Enter a descriptive name for the cell'}
              disabled={loading}
              inputProps={{
                maxLength: 100,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              autoFocus
              label='Line Number'
              fullWidth
              variant='outlined'
              value={lineNumber}
              onChange={e => {
                const value = e.target.value.toUpperCase();
                setLineNumber(value);
                setLineError('');
              }}
              error={!!lineError}
              helperText={lineError || 'Enter a unique line number (e.g., LINE-01, CELL-A)'}
              disabled={loading}
              inputProps={{
                maxLength: 50,
                style: { textTransform: 'uppercase' },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          disabled={loading || !cellName.trim() || !lineNumber.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        >
          {loading ? 'Creating...' : 'Create Cell'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Cell option renderer for autocomplete
 */
const CellOption: React.FC<{
  cell: Cell;
  showCounts: boolean;
  inputValue: string;
}> = ({ cell, showCounts, inputValue }) => {
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
      <CellIcon color='action' fontSize='small' />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='body2' component='div'>
            {highlightText(cell.name, inputValue)}
          </Typography>
          <Chip
            label={cell.lineNumber}
            size='small'
            variant='outlined'
            sx={{ fontSize: '0.75rem', height: 20 }}
          />
        </Box>
        {showCounts && (
          <Typography variant='caption' color='text.secondary'>
            {cell.equipmentCount || 0} equipment
            {cell.siteName && ` in ${cell.siteName}`}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * Cell Selector Component
 */
export const CellSelector: React.FC<CellSelectorProps> = ({
  siteId,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  showCounts = true,
  allowCreate = true,
  size = 'medium',
  fullWidth = true,
  autoFocus = false,
  'data-testid': testId,
}) => {
  // Local state
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCellType, setSelectedCellType] = useState<CellType>(CellType.ASSEMBLY_LINE);
  const [localOptions, setLocalOptions] = useState<Cell[]>([]);

  // Store hooks
  const {
    cells,
    cellSuggestions,
    sites,
    isLoadingCells,
    isCreatingCell,
    // error: _storeError, // Unused
    // loadCells: _loadCells, // Unused
    getCellsBySite,
    searchCellSuggestions,
    createCell,
  } = useHierarchyStore();

  // Debounced search query
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Find selected cell and site
  const selectedCell = useMemo(() => {
    if (!value) return null;
    return cells.find(cell => cell.id === value) || null;
  }, [value, cells]);

  const selectedSite = useMemo(() => {
    if (!siteId) return null;
    return sites.find(site => site.id === siteId) || null;
  }, [siteId, sites]);

  // Whether component is effectively disabled
  const isDisabled = disabled || !siteId;

  // Load cells when site changes
  useEffect(() => {
    if (siteId) {
      getCellsBySite(siteId);
    }
  }, [siteId, getCellsBySite]);

  // Search for cell suggestions when input changes
  useEffect(() => {
    if (debouncedInputValue && open && siteId) {
      searchCellSuggestions(siteId, debouncedInputValue);
    }
  }, [debouncedInputValue, open, siteId, searchCellSuggestions]);

  // Update local options based on site and search
  useEffect(() => {
    if (!siteId) {
      setLocalOptions([]);
      return;
    }

    let options: Cell[] = [];

    if (debouncedInputValue && cellSuggestions.length > 0) {
      // Use search suggestions when actively searching
      options = cellSuggestions.map(suggestion => ({
        id: suggestion.id,
        siteId: suggestion.id, // This should be the actual siteId
        name: suggestion.name,
        lineNumber: suggestion.lineNumber,
        siteName: suggestion.siteName,
        equipmentCount: suggestion.equipmentCount,
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
      }));
    } else {
      // Use cells for the selected site
      options = cells.filter(cell => cell.siteId === siteId);
    }

    // Apply additional filtering if user is typing
    if (inputValue) {
      const query = inputValue.toLowerCase();
      options = options.filter(
        cell =>
          cell.name.toLowerCase().includes(query) || cell.lineNumber.toLowerCase().includes(query)
      );
    }

    setLocalOptions(options);
  }, [cells, cellSuggestions, siteId, debouncedInputValue, inputValue]);

  // Handle selection change
  const handleChange = useCallback(
    (_event: unknown, newValue: Cell | null) => {
      onChange(newValue?.id || null, newValue);
    },
    [onChange]
  );

  // Handle input change
  const handleInputChange = useCallback((_event: unknown, newInputValue: string) => {
    setInputValue(newInputValue);
  }, []);

  // Handle create cell
  const handleCreateCell = useCallback(
    async (data: CreateCellDto) => {
      const newCell = await createCell(data);
      setCreateDialogOpen(false);
      onChange(newCell.id, newCell);
    },
    [createCell, onChange]
  );

  // Reset selection when site changes
  useEffect(() => {
    if (value && selectedCell && selectedCell.siteId !== siteId) {
      onChange(null, null);
    }
  }, [siteId, value, selectedCell, onChange]);

  return (
    <>
      <Box sx={{ width: fullWidth ? '100%' : 300 }}>
        {/* Site dependency warning */}
        {!siteId && (
          <Alert severity='info' sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon fontSize='small' />
              <Typography variant='body2'>Select a site first to choose a cell</Typography>
            </Box>
          </Alert>
        )}

        {/* Cell Type Selector */}
        <FormControl fullWidth={fullWidth} size={size} disabled={isDisabled} sx={{ mb: 2 }}>
          <InputLabel>Cell Type</InputLabel>
          <Select
            value={selectedCellType}
            onChange={e => setSelectedCellType(e.target.value as CellType)}
            label='Cell Type'
            startAdornment={<CellIcon color='action' sx={{ mr: 1 }} />}
          >
            {Object.values(CellType).map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Select the type of production cell</FormHelperText>
        </FormControl>

        {/* Cell ID Autocomplete */}
        <Autocomplete
          value={selectedCell}
          onChange={handleChange}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          options={localOptions}
          getOptionLabel={option => `${option.name} (${option.lineNumber})`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={isLoadingCells && debouncedInputValue !== ''}
          disabled={isDisabled}
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
              label='Cell'
              placeholder={
                selectedCell
                  ? `${selectedCell.name} (${selectedCell.lineNumber})`
                  : 'Select a cell...'
              }
              required={required}
              error={!!error}
              helperText={
                error ||
                helperText ||
                (selectedSite ? `Cells in ${selectedSite.name}` : 'No site selected')
              }
              autoFocus={autoFocus}
              InputProps={{
                ...params.InputProps,
                startAdornment: <CellIcon color='action' sx={{ mr: 1 }} />,
                endAdornment: (
                  <>
                    {isLoadingCells && debouncedInputValue !== '' ? (
                      <CircularProgress color='inherit' size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <CellOption cell={option} showCounts={showCounts} inputValue={inputValue} />
            </li>
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant='outlined'
                label={`${option.name} (${option.lineNumber})`}
                size={size}
                {...getTagProps({ index })}
                key={option.id}
              />
            ))
          }
          noOptionsText={
            !siteId ? (
              <Typography variant='body2' color='text.secondary'>
                Select a site first
              </Typography>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  {inputValue ? `No cells found for "${inputValue}"` : 'No cells in this site'}
                </Typography>
                {allowCreate && siteId && (
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ mt: 1 }}
                  >
                    Create new cell
                  </Button>
                )}
              </Box>
            )
          }
          filterOptions={options => options} // We handle filtering manually
        />

        {/* Helper text for selected cell */}
        {selectedCell && showCounts && !error && !helperText && (
          <FormHelperText sx={{ mt: 1 }}>
            {selectedCell.equipmentCount || 0} equipment in this cell
          </FormHelperText>
        )}

        {/* Quick create button when site is selected */}
        {allowCreate && siteId && !selectedCell && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Button
              variant='outlined'
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={isDisabled}
              size={size}
            >
              Create New Cell
            </Button>
          </Box>
        )}
      </Box>

      {/* Create cell dialog */}
      {selectedSite && (
        <CellCreateDialog
          open={createDialogOpen}
          siteId={selectedSite.id}
          siteName={selectedSite.name}
          initialCellType={selectedCellType}
          onClose={() => setCreateDialogOpen(false)}
          onConfirm={handleCreateCell}
          loading={isCreatingCell}
        />
      )}
    </>
  );
};

/**
 * Memoized version for performance
 */
export const MemoizedCellSelector = React.memo(CellSelector);

/**
 * Export cell types for external use (already exported above with the enum declaration)
 */

/**
 * Default export
 */
export default CellSelector;

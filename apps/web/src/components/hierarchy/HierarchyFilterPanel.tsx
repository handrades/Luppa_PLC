/**
 * Hierarchy Filter Panel Component
 * Collapsible filter sidebar for hierarchy filtering
 * Story 4.5: Site Hierarchy Management
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  GridView as CellIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Memory as EquipmentIcon,
  ExpandMore as ExpandMoreIcon,
  Factory as FactoryIcon,
  FilterList as FilterIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { useHierarchyStore } from '../../stores/hierarchy.store';
import { EquipmentType } from '../../types/equipment';
import { HierarchyFilters } from '../../types/hierarchy';
import { CellType } from './CellSelector';

/**
 * Props for the HierarchyFilterPanel component
 */
interface HierarchyFilterPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel open state changes */
  onOpenChange: (open: boolean) => void;
  /** Panel width when open */
  width?: number;
  /** Whether to show as overlay (mobile) or permanent (desktop) */
  variant?: 'permanent' | 'temporary';
  /** Custom anchor position */
  anchor?: 'left' | 'right';
  /** Whether to show filter presets */
  showPresets?: boolean;
  /** Whether to show advanced filters */
  showAdvanced?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

// Filter preset interface removed - not currently used

/**
 * Filter preset dialog component
 */
const FilterPresetDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  existingNames: string[];
}> = ({ open, onClose, onSave, existingNames }) => {
  const [presetName, setPresetName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!presetName.trim()) {
      setError('Preset name is required');
      return;
    }

    if (existingNames.includes(presetName.trim())) {
      setError('Preset name already exists');
      return;
    }

    onSave(presetName.trim());
    setPresetName('');
    setError('');
  };

  const handleClose = () => {
    setPresetName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Save Filter Preset</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin='dense'
          label='Preset Name'
          fullWidth
          variant='outlined'
          value={presetName}
          onChange={e => {
            setPresetName(e.target.value);
            setError('');
          }}
          error={!!error}
          helperText={error || 'Enter a name for this filter combination'}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={!presetName.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Main Hierarchy Filter Panel Component
 */
export const HierarchyFilterPanel: React.FC<HierarchyFilterPanelProps> = ({
  open,
  onOpenChange,
  width = 320,
  variant = 'temporary',
  anchor = 'left',
  showPresets = true,
  showAdvanced = true,
  'data-testid': testId,
}) => {
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [selectedCellTypes, setSelectedCellTypes] = useState<CellType[]>([]);
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<EquipmentType[]>([]);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [expandLevel, setExpandLevel] = useState(1);
  const [presetDialog, setPresetDialog] = useState(false);
  const [presetMenu, setPresetMenu] = useState<null | HTMLElement>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'sites',
    'cells',
    'equipment',
  ]);

  // Store hooks
  const {
    sites,
    cells,
    filters,
    // appliedFilters, // Unused
    preferences,
    loadSites,
    loadCells,
    setFilters,
    applyFilters,
    clearFilters,
    saveFilterPreset,
    loadFilterPreset,
    // deleteFilterPreset, // Unused
    // updatePreferences, // Unused
    hasUnsavedChanges,
  } = useHierarchyStore();

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load data on mount
  useEffect(() => {
    if (sites.length === 0) loadSites();
    if (cells.length === 0) loadCells();
  }, [sites.length, cells.length, loadSites, loadCells]);

  // Sync local state with store filters
  useEffect(() => {
    setSelectedSites(filters.siteIds || []);
    setSelectedCells(filters.cellIds || []);
    setSearchQuery(filters.search || '');
    setShowEmpty(filters.showEmpty || false);
    setShowCounts(filters.showCounts !== false);
    setExpandLevel(filters.expandLevel || 1);
  }, [filters]);

  // Update filters when local state changes
  useEffect(() => {
    const newFilters: HierarchyFilters = {
      siteIds: selectedSites.length > 0 ? selectedSites : undefined,
      cellIds: selectedCells.length > 0 ? selectedCells : undefined,
      search: debouncedSearchQuery || undefined,
      showEmpty,
      showCounts,
      expandLevel,
    };

    setFilters(newFilters);
  }, [
    selectedSites,
    selectedCells,
    debouncedSearchQuery,
    showEmpty,
    showCounts,
    expandLevel,
    setFilters,
  ]);

  // Get filtered cells based on selected sites
  const filteredCells = useMemo(() => {
    if (selectedSites.length === 0) return cells;
    return cells.filter(cell => selectedSites.includes(cell.siteId));
  }, [cells, selectedSites]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSites.length > 0) count++;
    if (selectedCells.length > 0) count++;
    if (selectedCellTypes.length > 0) count++;
    if (selectedEquipmentTypes.length > 0) count++;
    if (searchQuery) count++;
    if (showEmpty) count++;
    return count;
  }, [
    selectedSites.length,
    selectedCells.length,
    selectedCellTypes.length,
    selectedEquipmentTypes.length,
    searchQuery,
    showEmpty,
  ]);

  // Handle section expansion
  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  }, []);

  // Handle site selection
  const handleSiteToggle = useCallback((siteId: string) => {
    setSelectedSites(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    );
  }, []);

  // Handle cell selection
  const handleCellToggle = useCallback((cellId: string) => {
    setSelectedCells(prev =>
      prev.includes(cellId) ? prev.filter(id => id !== cellId) : [...prev, cellId]
    );
  }, []);

  // Handle cell type selection (unused but may be needed for future features)
  // const handleCellTypeToggle = useCallback((cellType: CellType) => {
  //   setSelectedCellTypes(prev =>
  //     prev.includes(cellType)
  //       ? prev.filter(type => type !== cellType)
  //       : [...prev, cellType]
  //   );
  // }, []);

  // Handle equipment type selection
  const handleEquipmentTypeToggle = useCallback((equipmentType: EquipmentType) => {
    setSelectedEquipmentTypes(prev =>
      prev.includes(equipmentType)
        ? prev.filter(type => type !== equipmentType)
        : [...prev, equipmentType]
    );
  }, []);

  // Handle clear all filters
  const handleClearAll = useCallback(() => {
    setSelectedSites([]);
    setSelectedCells([]);
    setSelectedCellTypes([]);
    setSelectedEquipmentTypes([]);
    setSearchQuery('');
    setShowEmpty(false);
    setShowCounts(true);
    setExpandLevel(1);
    clearFilters();
  }, [clearFilters]);

  // Handle apply filters
  const handleApplyFilters = useCallback(() => {
    applyFilters();
  }, [applyFilters]);

  // Handle save preset
  const handleSavePreset = useCallback(
    (name: string) => {
      saveFilterPreset(name, filters);
      setPresetDialog(false);
    },
    [saveFilterPreset, filters]
  );

  // Handle load preset
  const handleLoadPreset = useCallback(
    (presetName: string) => {
      loadFilterPreset(presetName);
      setPresetMenu(null);
    },
    [loadFilterPreset]
  );

  // Handle delete preset (unused but may be needed for future features)
  // const handleDeletePreset = useCallback((presetName: string) => {
  //   deleteFilterPreset(presetName);
  //   setPresetMenu(null);
  // }, [deleteFilterPreset]);

  // Render section content
  const renderSectionContent = (sectionId: string) => {
    const isExpanded = expandedSections.includes(sectionId);

    switch (sectionId) {
      case 'search':
        return (
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size='small'
              placeholder='Search hierarchy...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color='action' sx={{ mr: 1 }} />,
                endAdornment: searchQuery && (
                  <IconButton size='small' onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize='small' />
                  </IconButton>
                ),
              }}
            />
          </Box>
        );

      case 'sites':
        return (
          <Collapse in={isExpanded}>
            <Box sx={{ p: 2 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedSites.length === sites.length && sites.length > 0}
                      indeterminate={
                        selectedSites.length > 0 && selectedSites.length < sites.length
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedSites(sites.map(site => site.id));
                        } else {
                          setSelectedSites([]);
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant='body2' fontWeight='medium'>
                      Select All
                    </Typography>
                  }
                />
                {sites.map(site => (
                  <FormControlLabel
                    key={site.id}
                    control={
                      <Checkbox
                        checked={selectedSites.includes(site.id)}
                        onChange={() => handleSiteToggle(site.id)}
                        size='small'
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FactoryIcon fontSize='small' color='action' />
                        <Typography variant='body2'>{site.name}</Typography>
                        {showCounts && site.equipmentCount && (
                          <Chip
                            label={site.equipmentCount}
                            size='small'
                            variant='outlined'
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          </Collapse>
        );

      case 'cells':
        return (
          <Collapse in={isExpanded}>
            <Box sx={{ p: 2 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        selectedCells.length === filteredCells.length && filteredCells.length > 0
                      }
                      indeterminate={
                        selectedCells.length > 0 && selectedCells.length < filteredCells.length
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedCells(filteredCells.map(cell => cell.id));
                        } else {
                          setSelectedCells([]);
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant='body2' fontWeight='medium'>
                      Select All
                    </Typography>
                  }
                />
                {filteredCells.map(cell => (
                  <FormControlLabel
                    key={cell.id}
                    control={
                      <Checkbox
                        checked={selectedCells.includes(cell.id)}
                        onChange={() => handleCellToggle(cell.id)}
                        size='small'
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CellIcon fontSize='small' color='action' />
                        <Box>
                          <Typography variant='body2'>{cell.name}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {cell.lineNumber} • {cell.siteName}
                          </Typography>
                        </Box>
                        {showCounts && cell.equipmentCount && (
                          <Chip
                            label={cell.equipmentCount}
                            size='small'
                            variant='outlined'
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          </Collapse>
        );

      case 'equipment':
        return (
          <Collapse in={isExpanded}>
            <Box sx={{ p: 2 }}>
              <Typography variant='body2' fontWeight='medium' sx={{ mb: 1 }}>
                Equipment Types
              </Typography>
              <FormGroup>
                {Object.values(EquipmentType).map(type => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        checked={selectedEquipmentTypes.includes(type)}
                        onChange={() => handleEquipmentTypeToggle(type)}
                        size='small'
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EquipmentIcon fontSize='small' color='action' />
                        <Typography variant='body2'>{type}</Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          </Collapse>
        );

      case 'options':
        return (
          <Collapse in={isExpanded}>
            <Box sx={{ p: 2 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showEmpty}
                      onChange={e => setShowEmpty(e.target.checked)}
                      size='small'
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body2'>Show Empty Nodes</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Show sites/cells with no equipment
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCounts}
                      onChange={e => setShowCounts(e.target.checked)}
                      size='small'
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body2'>Show Counts</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Display equipment counts
                      </Typography>
                    </Box>
                  }
                />
              </FormGroup>

              <Box sx={{ mt: 2 }}>
                <Typography variant='body2' fontWeight='medium' sx={{ mb: 1 }}>
                  Default Expansion Level
                </Typography>
                <FormControl fullWidth size='small'>
                  <TextField
                    type='number'
                    value={expandLevel}
                    onChange={e => setExpandLevel(Math.max(0, parseInt(e.target.value) || 0))}
                    inputProps={{ min: 0, max: 3 }}
                    helperText='0: Collapsed, 1: Sites, 2: Cells, 3: Equipment'
                  />
                </FormControl>
              </Box>
            </Box>
          </Collapse>
        );

      default:
        return null;
    }
  };

  // Panel content
  const panelContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid={testId}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant='h6'>Filters</Typography>
            {activeFilterCount > 0 && <Badge badgeContent={activeFilterCount} color='primary' />}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {showPresets && (
              <Tooltip title='Filter Presets'>
                <IconButton size='small' onClick={e => setPresetMenu(e.currentTarget)}>
                  <BookmarkBorderIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title='Save Current Filters'>
              <IconButton
                size='small'
                onClick={() => setPresetDialog(true)}
                disabled={activeFilterCount === 0}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title='Clear All Filters'>
              <IconButton size='small' onClick={handleClearAll} disabled={activeFilterCount === 0}>
                <ClearIcon />
              </IconButton>
            </Tooltip>

            {variant === 'temporary' && (
              <IconButton size='small' onClick={() => onOpenChange(false)}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Filter Sections */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Search */}
        <Paper elevation={0} sx={{ mb: 1 }}>
          {renderSectionContent('search')}
        </Paper>

        {/* Sites */}
        <Accordion
          expanded={expandedSections.includes('sites')}
          onChange={() => handleSectionToggle('sites')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FactoryIcon fontSize='small' />
              <Typography>Sites</Typography>
              {selectedSites.length > 0 && (
                <Chip
                  label={selectedSites.length}
                  size='small'
                  color='primary'
                  variant='outlined'
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>{renderSectionContent('sites')}</AccordionDetails>
        </Accordion>

        {/* Cells */}
        <Accordion
          expanded={expandedSections.includes('cells')}
          onChange={() => handleSectionToggle('cells')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CellIcon fontSize='small' />
              <Typography>Cells</Typography>
              {selectedCells.length > 0 && (
                <Chip
                  label={selectedCells.length}
                  size='small'
                  color='primary'
                  variant='outlined'
                />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>{renderSectionContent('cells')}</AccordionDetails>
        </Accordion>

        {/* Equipment */}
        {showAdvanced && (
          <Accordion
            expanded={expandedSections.includes('equipment')}
            onChange={() => handleSectionToggle('equipment')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EquipmentIcon fontSize='small' />
                <Typography>Equipment</Typography>
                {selectedEquipmentTypes.length > 0 && (
                  <Chip
                    label={selectedEquipmentTypes.length}
                    size='small'
                    color='primary'
                    variant='outlined'
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>{renderSectionContent('equipment')}</AccordionDetails>
          </Accordion>
        )}

        {/* Options */}
        {showAdvanced && (
          <Accordion
            expanded={expandedSections.includes('options')}
            onChange={() => handleSectionToggle('options')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TuneIcon fontSize='small' />
                <Typography>Options</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>{renderSectionContent('options')}</AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        {hasUnsavedChanges() && (
          <Alert severity='info' sx={{ mb: 2 }}>
            <Typography variant='body2'>You have unsaved filter changes</Typography>
          </Alert>
        )}

        <Button
          fullWidth
          variant='contained'
          onClick={handleApplyFilters}
          disabled={!hasUnsavedChanges()}
          startIcon={<FilterIcon />}
        >
          Apply Filters
        </Button>
      </Box>

      {/* Preset Menu */}
      <Menu anchorEl={presetMenu} open={Boolean(presetMenu)} onClose={() => setPresetMenu(null)}>
        <MenuItem onClick={() => setPresetDialog(true)}>
          <SaveIcon fontSize='small' sx={{ mr: 1 }} />
          Save Current Filters
        </MenuItem>
        <Divider />
        {(preferences.savedFilters || []).map((preset: { name: string; filters: unknown }) => (
          <MenuItem key={preset.name} onClick={() => handleLoadPreset(preset.name)}>
            <BookmarkIcon fontSize='small' sx={{ mr: 1 }} />
            {preset.name}
          </MenuItem>
        ))}
        {(!preferences.savedFilters || preferences.savedFilters.length === 0) && (
          <MenuItem disabled>
            <Typography variant='body2' color='text.secondary'>
              No saved presets
            </Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Save Preset Dialog */}
      <FilterPresetDialog
        open={presetDialog}
        onClose={() => setPresetDialog(false)}
        onSave={handleSavePreset}
        existingNames={(preferences.savedFilters || []).map(
          (p: { name: string; filters: unknown }) => p.name
        )}
      />
    </Box>
  );

  // Render as drawer
  return (
    <Drawer
      variant={variant}
      anchor={anchor}
      open={open}
      onClose={() => onOpenChange(false)}
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
        },
      }}
    >
      {panelContent}
    </Drawer>
  );
};

/**
 * Memoized version for performance
 */
export const MemoizedHierarchyFilterPanel = React.memo(HierarchyFilterPanel);

/**
 * Default export
 */
export default HierarchyFilterPanel;

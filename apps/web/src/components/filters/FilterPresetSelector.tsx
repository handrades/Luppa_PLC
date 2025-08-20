/**
 * Filter Preset Selector Component
 * Story 5.1: Advanced Filtering System
 *
 * Component for managing filter presets - selecting, creating, and deleting
 * saved filter combinations.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Bookmark as BookmarkIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  StarBorder as StarBorderIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import type { AdvancedFilters, FilterPreset } from '../../types/advanced-filters';

/**
 * Props for FilterPresetSelector component
 */
interface FilterPresetSelectorProps {
  presets: FilterPreset[];
  currentFilters: AdvancedFilters;
  onPresetSelect: (preset: FilterPreset) => void;
  onPresetDelete: (presetId: string) => void;
  onPresetCreate?: (name: string, description?: string) => void;
  onPresetUpdate?: (preset: FilterPreset) => void;
  loading?: boolean;
}

/**
 * Calculate the number of active filters in a preset
 */
const countActiveFilters = (filters: AdvancedFilters): number => {
  let count = 0;

  count += filters.siteIds?.length || 0;
  count += filters.cellTypes?.length || 0;
  count += filters.equipmentTypes?.length || 0;
  count += filters.makes?.length || 0;
  count += filters.models?.length || 0;
  count += filters.createdAfter ? 1 : 0;
  count += filters.createdBefore ? 1 : 0;
  count += filters.updatedAfter ? 1 : 0;
  count += filters.updatedBefore ? 1 : 0;
  count += filters.ipRange ? 1 : 0;
  count += filters.tagFilter ? 1 : 0;
  count += filters.searchQuery ? 1 : 0;

  return count;
};

/**
 * Generate a summary description of filters
 */
const generateFilterSummary = (filters: AdvancedFilters): string => {
  const parts: string[] = [];

  if (filters.siteIds && filters.siteIds.length > 0) {
    parts.push(`${filters.siteIds.length} site${filters.siteIds.length > 1 ? 's' : ''}`);
  }

  if (filters.equipmentTypes && filters.equipmentTypes.length > 0) {
    parts.push(
      `${filters.equipmentTypes.length} equipment type${filters.equipmentTypes.length > 1 ? 's' : ''}`
    );
  }

  if (filters.createdAfter || filters.createdBefore) {
    parts.push('date range');
  }

  if (filters.ipRange) {
    parts.push('IP range');
  }

  if (filters.tagFilter) {
    const tagCount =
      (filters.tagFilter.include?.length || 0) + (filters.tagFilter.exclude?.length || 0);
    parts.push(`${tagCount} tag${tagCount > 1 ? 's' : ''}`);
  }

  if (filters.searchQuery) {
    parts.push('search');
  }

  return parts.length > 0 ? parts.join(', ') : 'No filters';
};

/**
 * Filter preset selector component
 */
export const FilterPresetSelector: React.FC<FilterPresetSelectorProps> = ({
  presets,
  currentFilters,
  onPresetSelect,
  onPresetDelete,
  onPresetCreate,
  onPresetUpdate,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // Handle preset menu actions
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, preset: FilterPreset) => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setSelectedPreset(preset);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedPreset(null);
  }, []);

  // Handle preset deletion
  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedPreset) {
      onPresetDelete(selectedPreset.id);
      setDeleteDialogOpen(false);
      setSelectedPreset(null);
    }
  }, [selectedPreset, onPresetDelete]);

  // Handle preset creation
  const handleCreateClick = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(() => {
    if (newPresetName.trim() && onPresetCreate) {
      onPresetCreate(newPresetName.trim(), newPresetDescription.trim() || undefined);
      setNewPresetName('');
      setNewPresetDescription('');
      setCreateDialogOpen(false);
    }
  }, [newPresetName, newPresetDescription, onPresetCreate]);

  // Handle set as default
  const handleSetDefault = useCallback(() => {
    if (selectedPreset && onPresetUpdate) {
      onPresetUpdate({
        ...selectedPreset,
        isDefault: !selectedPreset.isDefault,
      });
    }
    handleMenuClose();
  }, [selectedPreset, onPresetUpdate, handleMenuClose]);

  // Sort presets - default first, then by usage count, then by name
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name);
  });

  const currentFilterCount = countActiveFilters(currentFilters);

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
        <Typography variant='body2' color='textSecondary'>
          Saved Filter Presets
        </Typography>
        {onPresetCreate && currentFilterCount > 0 && (
          <Button
            size='small'
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
            variant='outlined'
          >
            Save Current
          </Button>
        )}
      </Box>

      {presets.length === 0 ? (
        <Alert severity='info' sx={{ fontSize: '0.875rem' }}>
          No saved presets. Apply some filters and save them as a preset for quick access.
        </Alert>
      ) : (
        <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
          {sortedPresets.map(preset => {
            const filterCount = countActiveFilters(preset.filterConfig);
            const summary = generateFilterSummary(preset.filterConfig);

            return (
              <ListItem
                key={preset.id}
                component='div'
                onClick={() => onPresetSelect(preset)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {preset.isDefault ? (
                    <StarIcon color='primary' fontSize='small' />
                  ) : (
                    <BookmarkIcon color='action' fontSize='small' />
                  )}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box display='flex' alignItems='center' gap={1}>
                      <Typography variant='body2' fontWeight={500}>
                        {preset.name}
                      </Typography>
                      {preset.isShared && (
                        <Tooltip title='Shared preset'>
                          <PublicIcon fontSize='small' color='action' />
                        </Tooltip>
                      )}
                      <Chip
                        label={filterCount}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem', height: 16, minWidth: 24 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant='caption' color='textSecondary' display='block'>
                        {summary}
                      </Typography>
                      <Typography variant='caption' color='textSecondary'>
                        Used {preset.usageCount} times
                        {preset.lastUsedAt && ` • Last used ${format(preset.lastUsedAt, 'MMM dd')}`}
                      </Typography>
                    </Box>
                  }
                />

                <ListItemSecondaryAction>
                  <IconButton size='small' onClick={e => handleMenuOpen(e, preset)} edge='end'>
                    <MoreVertIcon fontSize='small' />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Preset actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleSetDefault}>
          {selectedPreset?.isDefault ? (
            <>
              <StarBorderIcon fontSize='small' sx={{ mr: 1 }} />
              Remove from Default
            </>
          ) : (
            <>
              <StarIcon fontSize='small' sx={{ mr: 1 }} />
              Set as Default
            </>
          )}
        </MenuItem>

        {selectedPreset?.isShared && (
          <MenuItem onClick={handleMenuClose}>
            <ShareIcon fontSize='small' sx={{ mr: 1 }} />
            Copy Share Link
          </MenuItem>
        )}

        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize='small' sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Filter Preset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the preset "{selectedPreset?.name}"? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create preset dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            Save your current filter configuration for quick access later.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            label='Preset Name'
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            placeholder='e.g., Production Line A Equipment'
            sx={{ mt: 2, mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label='Description (Optional)'
            value={newPresetDescription}
            onChange={e => setNewPresetDescription(e.target.value)}
            placeholder='Brief description of what this preset filters'
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />

          <Alert severity='info' sx={{ fontSize: '0.875rem' }}>
            Current filters: {generateFilterSummary(currentFilters)} ({currentFilterCount} filters)
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSubmit} variant='contained' disabled={!newPresetName.trim()}>
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

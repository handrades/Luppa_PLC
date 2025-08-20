/**
 * Filter Chips Component
 * Story 5.1: Advanced Filtering System
 *
 * Displays active filters as removable chips with clear all functionality.
 * Provides visual feedback for applied filters.
 */

import React, { useMemo } from 'react';
import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import {
  Clear as ClearIcon,
  Close as CloseIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import type { AdvancedFilters, FilterChipsProps } from '../../types/advanced-filters';

/**
 * Interface for a filter chip
 */
interface FilterChip {
  id: string;
  label: string;
  value: string;
  filterType: keyof AdvancedFilters;
  filterValue?: unknown;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

/**
 * Utility function to generate filter chips from advanced filters
 */
const generateFilterChips = (filters: AdvancedFilters): FilterChip[] => {
  const chips: FilterChip[] = [];

  // Site filters
  if (filters.siteIds && filters.siteIds.length > 0) {
    filters.siteIds.forEach((siteId, index) => {
      chips.push({
        id: `site-${index}`,
        label: 'Site',
        value: siteId, // This would ideally be site name from lookup
        filterType: 'siteIds',
        filterValue: siteId,
        color: 'primary',
      });
    });
  }

  // Cell type filters
  if (filters.cellTypes && filters.cellTypes.length > 0) {
    filters.cellTypes.forEach((cellType, index) => {
      chips.push({
        id: `cellType-${index}`,
        label: 'Cell Type',
        value: cellType,
        filterType: 'cellTypes',
        filterValue: cellType,
        color: 'primary',
      });
    });
  }

  // Equipment type filters
  if (filters.equipmentTypes && filters.equipmentTypes.length > 0) {
    filters.equipmentTypes.forEach((equipmentType, index) => {
      chips.push({
        id: `equipmentType-${index}`,
        label: 'Equipment Type',
        value: equipmentType.replace('_', ' '),
        filterType: 'equipmentTypes',
        filterValue: equipmentType,
        color: 'secondary',
      });
    });
  }

  // Make filters
  if (filters.makes && filters.makes.length > 0) {
    filters.makes.forEach((make, index) => {
      chips.push({
        id: `make-${index}`,
        label: 'Make',
        value: make,
        filterType: 'makes',
        filterValue: make,
        color: 'info',
      });
    });
  }

  // Model filters
  if (filters.models && filters.models.length > 0) {
    filters.models.forEach((model, index) => {
      chips.push({
        id: `model-${index}`,
        label: 'Model',
        value: model,
        filterType: 'models',
        filterValue: model,
        color: 'info',
      });
    });
  }

  // Date filters
  if (filters.createdAfter) {
    chips.push({
      id: 'createdAfter',
      label: 'Created After',
      value: format(filters.createdAfter, 'MMM dd, yyyy'),
      filterType: 'createdAfter',
      color: 'success',
    });
  }

  if (filters.createdBefore) {
    chips.push({
      id: 'createdBefore',
      label: 'Created Before',
      value: format(filters.createdBefore, 'MMM dd, yyyy'),
      filterType: 'createdBefore',
      color: 'success',
    });
  }

  if (filters.updatedAfter) {
    chips.push({
      id: 'updatedAfter',
      label: 'Updated After',
      value: format(filters.updatedAfter, 'MMM dd, yyyy'),
      filterType: 'updatedAfter',
      color: 'success',
    });
  }

  if (filters.updatedBefore) {
    chips.push({
      id: 'updatedBefore',
      label: 'Updated Before',
      value: format(filters.updatedBefore, 'MMM dd, yyyy'),
      filterType: 'updatedBefore',
      color: 'success',
    });
  }

  // IP range filters
  if (filters.ipRange) {
    if (filters.ipRange.cidr) {
      chips.push({
        id: 'ipRange-cidr',
        label: 'IP Range',
        value: filters.ipRange.cidr,
        filterType: 'ipRange',
        color: 'warning',
      });
    } else if (filters.ipRange.startIP && filters.ipRange.endIP) {
      chips.push({
        id: 'ipRange-range',
        label: 'IP Range',
        value: `${filters.ipRange.startIP} - ${filters.ipRange.endIP}`,
        filterType: 'ipRange',
        color: 'warning',
      });
    }
  }

  // Tag filters
  if (filters.tagFilter) {
    if (filters.tagFilter.include && filters.tagFilter.include.length > 0) {
      filters.tagFilter.include.forEach((tag, index) => {
        chips.push({
          id: `tagInclude-${index}`,
          label: `Tag (${filters.tagFilter!.logic || 'AND'})`,
          value: `+${tag}`,
          filterType: 'tagFilter',
          filterValue: { type: 'include', value: tag },
          color: 'primary',
        });
      });
    }

    if (filters.tagFilter.exclude && filters.tagFilter.exclude.length > 0) {
      filters.tagFilter.exclude.forEach((tag, index) => {
        chips.push({
          id: `tagExclude-${index}`,
          label: 'Tag',
          value: `-${tag}`,
          filterType: 'tagFilter',
          filterValue: { type: 'exclude', value: tag },
          color: 'error',
        });
      });
    }
  }

  // Search query
  if (filters.searchQuery) {
    chips.push({
      id: 'searchQuery',
      label: 'Search',
      value:
        filters.searchQuery.length > 20
          ? `${filters.searchQuery.substring(0, 20)}...`
          : filters.searchQuery,
      filterType: 'searchQuery',
      color: 'default',
    });
  }

  return chips;
};

/**
 * Filter chips component
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  maxChips = 8,
  showClearAll = true,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Generate filter chips
  const filterChips = useMemo(() => generateFilterChips(filters), [filters]);

  // Determine which chips to show
  const visibleChips = expanded ? filterChips : filterChips.slice(0, maxChips);
  const hasMoreChips = filterChips.length > maxChips;
  const hiddenCount = filterChips.length - maxChips;

  if (filterChips.length === 0) {
    return null;
  }

  return (
    <Box>
      <Box display='flex' flexWrap='wrap' gap={0.5} alignItems='center'>
        {visibleChips.map(chip => (
          <Tooltip key={chip.id} title={`${chip.label}: ${chip.value} (click to remove)`} arrow>
            <Chip
              label={
                <Box display='flex' alignItems='center' gap={0.5}>
                  <Typography variant='caption' fontWeight={500}>
                    {chip.label}:
                  </Typography>
                  <Typography variant='caption'>{chip.value}</Typography>
                </Box>
              }
              size='small'
              color={chip.color}
              variant='filled'
              onDelete={() => onRemoveFilter(chip.filterType, chip.filterValue)}
              deleteIcon={<CloseIcon />}
              sx={{
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-label': {
                  px: 0.75,
                },
                '& .MuiChip-deleteIcon': {
                  width: 16,
                  height: 16,
                  margin: '0 4px 0 0',
                },
              }}
            />
          </Tooltip>
        ))}

        {/* Expand/Collapse button */}
        {hasMoreChips && (
          <Button
            size='small'
            variant='text'
            color='primary'
            onClick={() => setExpanded(!expanded)}
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              height: 24,
            }}
          >
            {expanded ? 'Show Less' : `+${hiddenCount} More`}
          </Button>
        )}

        {/* Clear all button */}
        {showClearAll && filterChips.length > 1 && (
          <Button
            size='small'
            variant='outlined'
            color='secondary'
            onClick={onClearAll}
            startIcon={<ClearIcon />}
            sx={{
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.25,
              height: 24,
              ml: 1,
            }}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Filter summary */}
      <Typography variant='caption' color='textSecondary' sx={{ mt: 0.5, display: 'block' }}>
        {filterChips.length === 1 ? '1 filter applied' : `${filterChips.length} filters applied`}
        {!expanded && hasMoreChips && ` (${hiddenCount} hidden)`}
      </Typography>
    </Box>
  );
};

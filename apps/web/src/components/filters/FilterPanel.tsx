/**
 * Main Filter Panel Component
 * Story 5.1: Advanced Filtering System
 *
 * Collapsible drawer panel containing all advanced filter options
 * with preset management and accessibility features.
 */

import React, { useCallback, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Save as SaveIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

import type { AdvancedFilters, FilterPanelProps } from '../../types/advanced-filters';
import { MultiSelectFilter } from './MultiSelectFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { IPRangeFilter } from './IPRangeFilter';
import { TagFilter } from './TagFilter';
import { FilterPresetSelector } from './FilterPresetSelector';
import { FilterChips } from './FilterChips';

/**
 * Props for individual filter sections
 */
interface FilterSectionProps {
  title: string;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  children: React.ReactNode;
  badge?: number;
  loading?: boolean;
}

/**
 * Individual filter section component with expansion state
 */
const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  expanded,
  onExpandChange,
  children,
  badge = 0,
  loading = false,
}) => {
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => onExpandChange(isExpanded)}
      disableGutters
      sx={{
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: 0,
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 48,
          '&.Mui-expanded': {
            minHeight: 48,
          },
          px: 2,
          py: 1,
        }}
      >
        <Box display='flex' alignItems='center' gap={1} flex={1}>
          <Typography variant='subtitle2' fontWeight={600}>
            {title}
          </Typography>
          {badge > 0 && (
            <Badge
              badgeContent={badge}
              color='primary'
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  height: 16,
                  minWidth: 16,
                },
              }}
            />
          )}
          {loading && (
            <Typography variant='caption' color='textSecondary'>
              Loading...
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
};

/**
 * Main FilterPanel component providing comprehensive filtering interface
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  presets,
  onPresetSelect,
  onPresetSave,
  mobile = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) || mobile;

  // Local state for section expansion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true,
    location: false,
    dates: false,
    network: false,
    tags: false,
  });

  // State for preset management
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isLoadingOptions] = useState(false);

  // Calculate active filter counts for badges
  const getActiveFilterCount = useCallback(
    (section: string) => {
      switch (section) {
        case 'location':
          return (
            (filters.siteIds?.length || 0) +
            (filters.cellTypes?.length || 0) +
            (filters.equipmentTypes?.length || 0) +
            (filters.makes?.length || 0) +
            (filters.models?.length || 0)
          );
        case 'dates':
          return (
            (filters.createdAfter ? 1 : 0) +
            (filters.createdBefore ? 1 : 0) +
            (filters.updatedAfter ? 1 : 0) +
            (filters.updatedBefore ? 1 : 0)
          );
        case 'network':
          return filters.ipRange ? 1 : 0;
        case 'tags':
          return filters.tagFilter ? 1 : 0;
        default:
          return 0;
      }
    },
    [filters]
  );

  // Handle section expansion
  const handleSectionExpand = useCallback((section: string, expanded: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: expanded,
    }));
  }, []);

  // Handle filter updates
  const handleFilterUpdate = useCallback(
    (updates: Partial<AdvancedFilters>) => {
      onFiltersChange({ ...filters, ...updates });
    },
    [filters, onFiltersChange]
  );

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  }, [filters.pageSize, filters.sortBy, filters.sortOrder, onFiltersChange]);

  // Handle save preset
  const handleSavePreset = useCallback(async () => {
    if (presetName.trim()) {
      await onPresetSave(presetName.trim());
      setPresetName('');
      setShowPresetSave(false);
    }
  }, [presetName, onPresetSave]);

  // Calculate total active filters
  const totalActiveFilters = Object.keys(expandedSections).reduce(
    (total, section) => total + getActiveFilterCount(section),
    0
  );

  // Panel content
  const panelContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box display='flex' alignItems='center' gap={1}>
          <FilterListIcon color='primary' />
          <Typography variant='h6' fontWeight={600}>
            Advanced Filters
          </Typography>
          {totalActiveFilters > 0 && (
            <Badge
              badgeContent={totalActiveFilters}
              color='primary'
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                },
              }}
            />
          )}
        </Box>

        <Box display='flex' alignItems='center' gap={0.5}>
          <Tooltip title='Save current filters as preset'>
            <IconButton
              onClick={() => setShowPresetSave(true)}
              disabled={totalActiveFilters === 0}
              size='small'
            >
              <BookmarkIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title='Share filter configuration'>
            <IconButton
              onClick={() => {
                /* TODO: Implement sharing */
              }}
              disabled={totalActiveFilters === 0}
              size='small'
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title='Clear all filters'>
            <IconButton
              onClick={handleClearAllFilters}
              disabled={totalActiveFilters === 0}
              size='small'
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>

          <IconButton onClick={onClose} size='small'>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Active filters display */}
      {totalActiveFilters > 0 && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant='subtitle2' gutterBottom>
            Active Filters
          </Typography>
          <FilterChips
            filters={filters}
            onRemoveFilter={(filterType, value) => {
              const updatedFilters = { ...filters };
              if (value !== undefined) {
                // Remove specific value from array
                const currentArray = updatedFilters[filterType] as unknown[];
                if (Array.isArray(currentArray)) {
                  (updatedFilters[filterType] as unknown) = currentArray.filter(
                    item => item !== value
                  );
                }
              } else {
                // Remove entire filter
                delete updatedFilters[filterType];
              }
              onFiltersChange(updatedFilters);
            }}
            onClearAll={handleClearAllFilters}
            maxChips={5}
          />
        </Box>
      )}

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Filter Presets Section */}
        <FilterSection
          title='Saved Presets'
          expanded={expandedSections.presets}
          onExpandChange={expanded => handleSectionExpand('presets', expanded)}
          loading={isLoadingOptions}
        >
          <FilterPresetSelector
            presets={presets}
            currentFilters={filters}
            onPresetSelect={onPresetSelect}
            onPresetDelete={_presetId => {
              // TODO: Implement preset deletion via API
              // _presetId will be used for deletion logic
            }}
          />

          {showPresetSave && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant='subtitle2' gutterBottom>
                Save Current Filters
              </Typography>
              <Box display='flex' gap={1} alignItems='center'>
                <input
                  type='text'
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder='Enter preset name'
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                <Button
                  variant='contained'
                  size='small'
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  startIcon={<SaveIcon />}
                >
                  Save
                </Button>
                <Button
                  variant='text'
                  size='small'
                  onClick={() => {
                    setShowPresetSave(false);
                    setPresetName('');
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </FilterSection>

        <Divider />

        {/* Location Filters Section */}
        <FilterSection
          title='Location & Equipment'
          expanded={expandedSections.location}
          onExpandChange={expanded => handleSectionExpand('location', expanded)}
          badge={getActiveFilterCount('location')}
          loading={isLoadingOptions}
        >
          <Box display='flex' flexDirection='column' gap={2}>
            <MultiSelectFilter
              label='Sites'
              options={[]} // TODO: Load from API
              values={filters.siteIds || []}
              onChange={values => handleFilterUpdate({ siteIds: values })}
              searchable
              loading={isLoadingOptions}
              helperText='Select one or more sites to filter equipment by location'
            />

            <MultiSelectFilter
              label='Cell Types'
              options={[]} // TODO: Load from API
              values={filters.cellTypes || []}
              onChange={values => handleFilterUpdate({ cellTypes: values })}
              searchable
              loading={isLoadingOptions}
              helperText='Filter by cell types within selected sites'
            />

            <MultiSelectFilter
              label='Equipment Types'
              options={[]} // TODO: Load from API
              values={filters.equipmentTypes || []}
              onChange={values => handleFilterUpdate({ equipmentTypes: values })}
              loading={isLoadingOptions}
              helperText='Select equipment types to include in results'
            />

            <MultiSelectFilter
              label='Makes'
              options={[]} // TODO: Load from API
              values={filters.makes || []}
              onChange={values => handleFilterUpdate({ makes: values })}
              searchable
              loading={isLoadingOptions}
              helperText='Filter by PLC manufacturer'
            />

            <MultiSelectFilter
              label='Models'
              options={[]} // TODO: Load from API, filtered by selected makes
              values={filters.models || []}
              onChange={values => handleFilterUpdate({ models: values })}
              searchable
              loading={isLoadingOptions}
              helperText='Select specific PLC models'
            />
          </Box>
        </FilterSection>

        <Divider />

        {/* Date Filters Section */}
        <FilterSection
          title='Date Ranges'
          expanded={expandedSections.dates}
          onExpandChange={expanded => handleSectionExpand('dates', expanded)}
          badge={getActiveFilterCount('dates')}
        >
          <DateRangeFilter
            createdAfter={filters.createdAfter}
            createdBefore={filters.createdBefore}
            updatedAfter={filters.updatedAfter}
            updatedBefore={filters.updatedBefore}
            onChange={dateFilters => handleFilterUpdate(dateFilters)}
          />
        </FilterSection>

        <Divider />

        {/* IP Range Filters Section */}
        <FilterSection
          title='Network & IP Addresses'
          expanded={expandedSections.network}
          onExpandChange={expanded => handleSectionExpand('network', expanded)}
          badge={getActiveFilterCount('network')}
        >
          <IPRangeFilter
            ipRange={filters.ipRange}
            onChange={ipRange => handleFilterUpdate({ ipRange })}
          />
        </FilterSection>

        <Divider />

        {/* Tag Filters Section */}
        <FilterSection
          title='Tags & Labels'
          expanded={expandedSections.tags}
          onExpandChange={expanded => handleSectionExpand('tags', expanded)}
          badge={getActiveFilterCount('tags')}
          loading={isLoadingOptions}
        >
          <TagFilter
            tagFilter={filters.tagFilter}
            availableTags={[]} // TODO: Load from API
            onChange={tagFilter => handleFilterUpdate({ tagFilter })}
            loading={isLoadingOptions}
          />
        </FilterSection>
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      variant={isMobile ? 'temporary' : 'persistent'}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 400,
          height: isMobile ? '80vh' : '100vh',
          backgroundColor: 'background.default',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {panelContent}
    </Drawer>
  );
};

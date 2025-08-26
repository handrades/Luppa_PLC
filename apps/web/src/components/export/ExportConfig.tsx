/**
 * Export Configuration Component
 *
 * Filter interface for customizing CSV exports with field selection,
 * format options, and export preview.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useExportState, useImportExportStore } from '../../stores/importExport.store';
import type { ExportOptions } from '../../stores/importExport.store';

interface ExportConfigProps {
  onExport?: () => void;
  disabled?: boolean;
  estimatedRecords?: number;
}

// Mock data for filter options - in real app, fetch from API
const EQUIPMENT_TYPES = ['PLC', 'HMI', 'ROBOT', 'SENSOR', 'ACTUATOR', 'DRIVE', 'MOTOR', 'VALVE'];

const SAMPLE_SITES = ['Plant A', 'Plant B', 'Plant C', 'Warehouse 1', 'Warehouse 2'];

const SAMPLE_MAKES = [
  'Siemens',
  'Allen-Bradley',
  'Schneider Electric',
  'ABB',
  'Mitsubishi',
  'Omron',
  'Beckhoff',
];

export const ExportConfig: React.FC<ExportConfigProps> = ({
  onExport,
  disabled = false,
  estimatedRecords = 0,
}) => {
  const { exportFilters, exportOptions, exportStatus } = useExportState();
  const { setExportFilters, setExportOptions } = useImportExportStore();

  const [selectedSites, setSelectedSites] = useState<string[]>(exportFilters.sites || []);
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>(
    exportFilters.equipmentTypes || []
  );
  const [selectedMakes, setSelectedMakes] = useState<string[]>(exportFilters.makes || []);
  const [searchTerm, setSearchTerm] = useState(exportFilters.search || '');
  const [dateFrom, setDateFrom] = useState<Date | null>(exportFilters.dateFrom || null);
  const [dateTo, setDateTo] = useState<Date | null>(exportFilters.dateTo || null);

  // Update store when local state changes
  useEffect(() => {
    setExportFilters({
      sites: selectedSites.length > 0 ? selectedSites : undefined,
      equipmentTypes: selectedEquipmentTypes.length > 0 ? selectedEquipmentTypes : undefined,
      makes: selectedMakes.length > 0 ? selectedMakes : undefined,
      search: searchTerm || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  }, [
    selectedSites,
    selectedEquipmentTypes,
    selectedMakes,
    searchTerm,
    dateFrom,
    dateTo,
    setExportFilters,
  ]);

  const handleExportOptionChange = (field: keyof ExportOptions, value: unknown) => {
    setExportOptions({ [field]: value });
  };

  const clearFilters = () => {
    setSelectedSites([]);
    setSelectedEquipmentTypes([]);
    setSelectedMakes([]);
    setSearchTerm('');
    setDateFrom(null);
    setDateTo(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedSites.length > 0) count++;
    if (selectedEquipmentTypes.length > 0) count++;
    if (selectedMakes.length > 0) count++;
    if (searchTerm) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const isExporting = exportStatus === 'preparing' || exportStatus === 'exporting';

  return (
    <Stack spacing={3}>
      {/* Filter Header */}
      <Box display='flex' alignItems='center' justifyContent='space-between'>
        <Stack direction='row' alignItems='center' spacing={1}>
          <FilterListIcon />
          <Typography variant='h6'>Export Filters</Typography>
          {activeFilterCount > 0 && (
            <Chip
              label={`${activeFilterCount} active`}
              size='small'
              color='primary'
              variant='outlined'
            />
          )}
        </Stack>
        {activeFilterCount > 0 && (
          <Button
            onClick={clearFilters}
            variant='text'
            size='small'
            disabled={disabled || isExporting}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Site Filter */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Location Filters
          </Typography>

          <Stack spacing={2}>
            <Autocomplete
              multiple
              options={SAMPLE_SITES}
              value={selectedSites}
              onChange={(_, newValue) => setSelectedSites(newValue)}
              disabled={disabled || isExporting}
              renderInput={params => (
                <TextField {...params} label='Sites' placeholder='Select sites...' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    variant='outlined'
                    label={option}
                    size='small'
                  />
                ))
              }
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Equipment Filter */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Equipment Filters
          </Typography>

          <Stack spacing={2}>
            <Autocomplete
              multiple
              options={EQUIPMENT_TYPES}
              value={selectedEquipmentTypes}
              onChange={(_, newValue) => setSelectedEquipmentTypes(newValue)}
              disabled={disabled || isExporting}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Equipment Types'
                  placeholder='Select equipment types...'
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    variant='outlined'
                    label={option}
                    size='small'
                  />
                ))
              }
            />

            <Autocomplete
              multiple
              options={SAMPLE_MAKES}
              value={selectedMakes}
              onChange={(_, newValue) => setSelectedMakes(newValue)}
              disabled={disabled || isExporting}
              renderInput={params => (
                <TextField
                  {...params}
                  label='Manufacturers'
                  placeholder='Select manufacturers...'
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    variant='outlined'
                    label={option}
                    size='small'
                  />
                ))
              }
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Date Range
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker
              label='From Date'
              value={dateFrom}
              onChange={newValue => setDateFrom(newValue)}
              disabled={disabled || isExporting}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'medium',
                },
              }}
            />
            <DatePicker
              label='To Date'
              value={dateTo}
              onChange={newValue => setDateTo(newValue)}
              disabled={disabled || isExporting}
              minDate={dateFrom || undefined}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'medium',
                },
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Text Search */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Text Search
          </Typography>

          <TextField
            fullWidth
            label='Search PLCs'
            placeholder='Search by description, tag ID, IP address...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            disabled={disabled || isExporting}
          />
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Export Options
          </Typography>

          <Stack spacing={2}>
            {/* Format Selection */}
            <FormControl component='fieldset' disabled={disabled || isExporting}>
              <FormLabel component='legend'>Export Format</FormLabel>
              <RadioGroup
                value={exportOptions.format}
                onChange={e => handleExportOptionChange('format', e.target.value)}
                row
              >
                <FormControlLabel value='csv' control={<Radio />} label='CSV' />
                {/* Future formats */}
                {/* <FormControlLabel value="xlsx" control={<Radio />} label="Excel" disabled />
                <FormControlLabel value="pdf" control={<Radio />} label="PDF" disabled /> */}
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Field Selection */}
            <FormControl component='fieldset' disabled={disabled || isExporting}>
              <FormLabel component='legend'>Include Fields</FormLabel>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeHierarchy}
                      onChange={e => handleExportOptionChange('includeHierarchy', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body2'>Hierarchy Information</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Site name, cell name, equipment name
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeTags}
                      onChange={e => handleExportOptionChange('includeTags', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body2'>Tag Data</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Additional tag metadata (if available)
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Export Preview */}
      <Card variant='outlined' sx={{ backgroundColor: 'grey.50' }}>
        <CardContent>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
            <Typography variant='h6'>Export Preview</Typography>
            <Tooltip title='Estimated based on current filters'>
              <InfoIcon fontSize='small' color='action' />
            </Tooltip>
          </Stack>

          <Stack spacing={1}>
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Estimated Records:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {estimatedRecords.toLocaleString()}
              </Typography>
            </Box>

            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Format:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {exportOptions.format.toUpperCase()}
              </Typography>
            </Box>

            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Includes Hierarchy:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {exportOptions.includeHierarchy ? 'Yes' : 'No'}
              </Typography>
            </Box>

            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Includes Tags:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {exportOptions.includeTags ? 'Yes' : 'No'}
              </Typography>
            </Box>
          </Stack>

          {estimatedRecords > 10000 && (
            <Alert severity='info' sx={{ mt: 2 }}>
              Large export detected. Processing may take a few minutes.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Button */}
      <Button
        variant='contained'
        startIcon={<DownloadIcon />}
        onClick={onExport}
        disabled={disabled || isExporting || estimatedRecords === 0}
        size='large'
        fullWidth
      >
        {isExporting
          ? 'Preparing Export...'
          : `Export ${estimatedRecords.toLocaleString()} Records`}
      </Button>
    </Stack>
  );
};

export default ExportConfig;

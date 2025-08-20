/**
 * Date Range Filter Component
 * Story 5.1: Advanced Filtering System
 *
 * Component for filtering by date ranges with preset options
 * and calendar pickers for created/updated timestamps.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Box, Button, ButtonGroup, Chip, Grid, Paper, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Clear as ClearIcon, DateRange as DateRangeIcon } from '@mui/icons-material';
import { addDays, addMonths, addYears, endOfDay, startOfDay } from 'date-fns';

/**
 * Props for DateRangeFilter component
 */
interface DateRangeFilterProps {
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  onChange: (filters: {
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
  }) => void;
}

/**
 * Preset date range options
 */
interface DatePreset {
  label: string;
  value: string;
  getRange: () => { start: Date; end: Date };
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Today',
    value: 'today',
    getRange: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 days',
    value: 'last7days',
    getRange: () => ({
      start: startOfDay(addDays(new Date(), -7)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    value: 'last30days',
    getRange: () => ({
      start: startOfDay(addDays(new Date(), -30)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 3 months',
    value: 'last3months',
    getRange: () => ({
      start: startOfDay(addMonths(new Date(), -3)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 6 months',
    value: 'last6months',
    getRange: () => ({
      start: startOfDay(addMonths(new Date(), -6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last year',
    value: 'lastyear',
    getRange: () => ({
      start: startOfDay(addYears(new Date(), -1)),
      end: endOfDay(new Date()),
    }),
  },
];

/**
 * Date range filter component
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  createdAfter,
  createdBefore,
  updatedAfter,
  updatedBefore,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'created' | 'updated'>('created');
  const [dateError, setDateError] = useState<string | null>(null);

  // Validate date ranges
  const validateDateRange = useCallback(
    (start?: Date, end?: Date) => {
      if (start && end && start > end) {
        return 'Start date cannot be after end date';
      }

      // Check for business logic constraints
      if (createdAfter && updatedBefore && createdAfter > updatedBefore) {
        return 'Created date cannot be after last updated date';
      }

      if (updatedAfter && createdBefore && updatedAfter < createdBefore) {
        return 'Updated date cannot be before created date';
      }

      return null;
    },
    [createdAfter, updatedBefore, updatedAfter, createdBefore]
  );

  // Handle preset selection for created dates
  const handleCreatedPreset = useCallback(
    (preset: DatePreset) => {
      const { start, end } = preset.getRange();
      const error = validateDateRange(start, end);

      if (error) {
        setDateError(error);
        return;
      }

      setDateError(null);
      onChange({
        createdAfter: start,
        createdBefore: end,
        updatedAfter,
        updatedBefore,
      });
    },
    [updatedAfter, updatedBefore, onChange, validateDateRange]
  );

  // Handle preset selection for updated dates
  const handleUpdatedPreset = useCallback(
    (preset: DatePreset) => {
      const { start, end } = preset.getRange();
      const error = validateDateRange(start, end);

      if (error) {
        setDateError(error);
        return;
      }

      setDateError(null);
      onChange({
        createdAfter,
        createdBefore,
        updatedAfter: start,
        updatedBefore: end,
      });
    },
    [createdAfter, createdBefore, onChange, validateDateRange]
  );

  // Handle individual date changes
  const handleDateChange = useCallback(
    (
      field: 'createdAfter' | 'createdBefore' | 'updatedAfter' | 'updatedBefore',
      date: Date | null
    ) => {
      const updates = {
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore,
        [field]: date,
      };

      // Validate the new date range
      let error = null;
      if (field === 'createdAfter' || field === 'createdBefore') {
        error = validateDateRange(updates.createdAfter, updates.createdBefore);
      } else {
        error = validateDateRange(updates.updatedAfter, updates.updatedBefore);
      }

      if (error) {
        setDateError(error);
      } else {
        setDateError(null);
      }

      onChange(updates);
    },
    [createdAfter, createdBefore, updatedAfter, updatedBefore, onChange, validateDateRange]
  );

  // Handle clear all dates
  const handleClearAll = useCallback(() => {
    setDateError(null);
    onChange({});
  }, [onChange]);

  // Check if any dates are set
  const hasActiveDates = !!(createdAfter || createdBefore || updatedAfter || updatedBefore);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography variant='subtitle2' fontWeight={500}>
            Date Range Filters
          </Typography>
          {hasActiveDates && (
            <Button
              size='small'
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              color='secondary'
            >
              Clear All
            </Button>
          )}
        </Box>

        {/* Tab selection */}
        <ButtonGroup size='small' fullWidth sx={{ mb: 2 }}>
          <Button
            variant={activeTab === 'created' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('created')}
            startIcon={<DateRangeIcon />}
          >
            Created Dates
          </Button>
          <Button
            variant={activeTab === 'updated' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('updated')}
            startIcon={<DateRangeIcon />}
          >
            Updated Dates
          </Button>
        </ButtonGroup>

        {/* Error display */}
        {dateError && (
          <Alert severity='error' sx={{ mb: 2, fontSize: '0.875rem' }}>
            {dateError}
          </Alert>
        )}

        {/* Created dates tab */}
        {activeTab === 'created' && (
          <Box>
            <Typography variant='body2' color='textSecondary' gutterBottom>
              Filter equipment by creation date
            </Typography>

            {/* Preset buttons */}
            <Box display='flex' flexWrap='wrap' gap={0.5} mb={2}>
              {DATE_PRESETS.map(preset => (
                <Chip
                  key={preset.value}
                  label={preset.label}
                  size='small'
                  variant='outlined'
                  clickable
                  onClick={() => handleCreatedPreset(preset)}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            {/* Date pickers */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label='Created After'
                  value={createdAfter || null}
                  onChange={date => handleDateChange('createdAfter', date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      helperText: 'Equipment created on or after this date',
                    },
                  }}
                  maxDate={createdBefore || new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label='Created Before'
                  value={createdBefore || null}
                  onChange={date => handleDateChange('createdBefore', date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      helperText: 'Equipment created on or before this date',
                    },
                  }}
                  minDate={createdAfter}
                  maxDate={new Date()}
                />
              </Grid>
            </Grid>

            {/* Active created date range display */}
            {(createdAfter || createdBefore) && (
              <Paper
                variant='outlined'
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: 'primary.50',
                  borderColor: 'primary.200',
                }}
              >
                <Typography variant='body2' fontWeight={500} gutterBottom>
                  Active Created Date Range:
                </Typography>
                <Typography variant='body2' color='textSecondary'>
                  {createdAfter ? createdAfter.toLocaleDateString() : 'Any date'} to{' '}
                  {createdBefore ? createdBefore.toLocaleDateString() : 'Today'}
                </Typography>
              </Paper>
            )}
          </Box>
        )}

        {/* Updated dates tab */}
        {activeTab === 'updated' && (
          <Box>
            <Typography variant='body2' color='textSecondary' gutterBottom>
              Filter equipment by last update date
            </Typography>

            {/* Preset buttons */}
            <Box display='flex' flexWrap='wrap' gap={0.5} mb={2}>
              {DATE_PRESETS.map(preset => (
                <Chip
                  key={preset.value}
                  label={preset.label}
                  size='small'
                  variant='outlined'
                  clickable
                  onClick={() => handleUpdatedPreset(preset)}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            {/* Date pickers */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label='Updated After'
                  value={updatedAfter || null}
                  onChange={date => handleDateChange('updatedAfter', date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      helperText: 'Equipment updated on or after this date',
                    },
                  }}
                  maxDate={updatedBefore || new Date()}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label='Updated Before'
                  value={updatedBefore || null}
                  onChange={date => handleDateChange('updatedBefore', date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      helperText: 'Equipment updated on or before this date',
                    },
                  }}
                  minDate={updatedAfter}
                  maxDate={new Date()}
                />
              </Grid>
            </Grid>

            {/* Active updated date range display */}
            {(updatedAfter || updatedBefore) && (
              <Paper
                variant='outlined'
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: 'secondary.50',
                  borderColor: 'secondary.200',
                }}
              >
                <Typography variant='body2' fontWeight={500} gutterBottom>
                  Active Updated Date Range:
                </Typography>
                <Typography variant='body2' color='textSecondary'>
                  {updatedAfter ? updatedAfter.toLocaleDateString() : 'Any date'} to{' '}
                  {updatedBefore ? updatedBefore.toLocaleDateString() : 'Today'}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

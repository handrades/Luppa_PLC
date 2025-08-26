/**
 * Import Options Component
 *
 * Configuration interface for import settings including duplicate handling,
 * auto-creation options, background processing, and import modes.
 */

import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useImportExportStore, useImportState } from '../../stores/importExport.store';
import type { ImportOptions } from '../../stores/importExport.store';

interface ImportOptionsProps {
  disabled?: boolean;
  showAdvanced?: boolean;
}

export const ImportOptionsComponent: React.FC<ImportOptionsProps> = ({
  disabled = false,
  showAdvanced = true,
}) => {
  const { importOptions, validationResult } = useImportState();
  const { setImportOptions } = useImportExportStore();

  const handleOptionChange = (field: keyof ImportOptions, value: unknown) => {
    setImportOptions({ [field]: value });
  };

  const estimatedRows = validationResult?.preview?.length || 0;
  const willUseBackground = estimatedRows > importOptions.backgroundThreshold;

  return (
    <Stack spacing={3}>
      {/* Import Mode */}
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Import Mode
          </Typography>
          <FormControl component='fieldset' disabled={disabled}>
            <RadioGroup
              value={importOptions.validateOnly ? 'validate' : 'import'}
              onChange={e => handleOptionChange('validateOnly', e.target.value === 'validate')}
            >
              <FormControlLabel
                value='validate'
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant='body2'>Validate Only</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Check for errors without importing data
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value='import'
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant='body2'>Import Data</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Validate and import data to the database
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Duplicate Handling */}
      <Card variant='outlined'>
        <CardContent>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
            <Typography variant='h6'>Duplicate Handling</Typography>
            <Tooltip title='How to handle records with existing tag IDs or IP addresses'>
              <InfoIcon fontSize='small' color='action' />
            </Tooltip>
          </Stack>

          <FormControl component='fieldset' disabled={disabled}>
            <RadioGroup
              value={importOptions.duplicateHandling}
              onChange={e => handleOptionChange('duplicateHandling', e.target.value)}
            >
              <FormControlLabel
                value='skip'
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant='body2'>Skip Duplicates</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Ignore rows with existing tag IDs or IP addresses
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value='overwrite'
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant='body2'>Overwrite Existing</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Replace existing records with new data
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value='merge'
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant='body2'>Merge Data</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      Update existing records with non-empty values from import
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Auto-Creation Options */}
      <Card variant='outlined'>
        <CardContent>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
            <Typography variant='h6'>Auto-Creation</Typography>
            <Tooltip title='Automatically create missing hierarchy entities during import'>
              <InfoIcon fontSize='small' color='action' />
            </Tooltip>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={importOptions.createMissing}
                onChange={e => handleOptionChange('createMissing', e.target.checked)}
                disabled={disabled}
              />
            }
            label={
              <Box>
                <Typography variant='body2'>Create Missing Entities</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Automatically create sites, cells, and equipment that don't exist
                </Typography>
              </Box>
            }
          />

          {!importOptions.createMissing && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              Import will fail if referenced sites, cells, or equipment don't exist
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Background Processing */}
      {showAdvanced && (
        <Card variant='outlined'>
          <CardContent>
            <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
              <Typography variant='h6'>Performance Settings</Typography>
              <Tooltip title='Settings for handling large imports'>
                <InfoIcon fontSize='small' color='action' />
              </Tooltip>
            </Stack>

            <Box sx={{ mb: 2 }}>
              <Typography variant='body2' sx={{ mb: 1 }}>
                Background Processing Threshold: {importOptions.backgroundThreshold} rows
              </Typography>
              <Slider
                value={importOptions.backgroundThreshold}
                onChange={(_, value) => handleOptionChange('backgroundThreshold', value)}
                min={100}
                max={10000}
                step={100}
                disabled={disabled}
                marks={[
                  { value: 100, label: '100' },
                  { value: 1000, label: '1K' },
                  { value: 5000, label: '5K' },
                  { value: 10000, label: '10K' },
                ]}
                sx={{ mt: 2 }}
              />
              <Typography variant='caption' color='text.secondary'>
                Files with more rows will be processed in the background
              </Typography>
            </Box>

            {willUseBackground && estimatedRows > 0 && (
              <Alert severity='info' icon={<InfoIcon />}>
                This import ({estimatedRows} rows) will run in the background. You can monitor
                progress and continue using the application.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Summary */}
      <Card variant='outlined' sx={{ backgroundColor: 'grey.50' }}>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 2 }}>
            Import Summary
          </Typography>

          <Stack spacing={1}>
            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Mode:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {importOptions.validateOnly ? 'Validate Only' : 'Import Data'}
              </Typography>
            </Box>

            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Duplicates:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {importOptions.duplicateHandling === 'skip'
                  ? 'Skip'
                  : importOptions.duplicateHandling === 'overwrite'
                    ? 'Overwrite'
                    : 'Merge'}
              </Typography>
            </Box>

            <Box display='flex' justifyContent='space-between'>
              <Typography variant='body2'>Create Missing:</Typography>
              <Typography variant='body2' fontWeight='medium'>
                {importOptions.createMissing ? 'Yes' : 'No'}
              </Typography>
            </Box>

            {showAdvanced && (
              <Box display='flex' justifyContent='space-between'>
                <Typography variant='body2'>Processing:</Typography>
                <Typography variant='body2' fontWeight='medium'>
                  {willUseBackground ? 'Background' : 'Immediate'}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default ImportOptionsComponent;

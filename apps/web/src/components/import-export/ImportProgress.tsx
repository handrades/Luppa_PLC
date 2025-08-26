import React from 'react';
import {
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { ImportResult } from '../../types/import-export';

interface ImportProgressProps {
  progress: ImportResult | null;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({ progress }) => {
  if (!progress) {
    return (
      <Box>
        <Typography variant='body1' gutterBottom>
          Preparing import...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  const progressPercent =
    progress.totalRows > 0 ? (progress.processedRows / progress.totalRows) * 100 : 0;

  const steps = [
    { label: 'Validating data', completed: progress.processedRows > 0 },
    { label: 'Creating hierarchy', completed: progress.processedRows > progress.totalRows * 0.25 },
    { label: 'Importing PLCs', completed: progress.processedRows > progress.totalRows * 0.5 },
    {
      label: 'Updating relationships',
      completed: progress.processedRows > progress.totalRows * 0.75,
    },
    { label: 'Finalizing', completed: progress.success },
  ];

  return (
    <Box>
      <Typography variant='h6' gutterBottom>
        Import Progress
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant='body2' color='text.secondary' gutterBottom>
          Processing {progress.processedRows} of {progress.totalRows} rows
        </Typography>
        <LinearProgress
          variant='determinate'
          value={progressPercent}
          sx={{ height: 8, borderRadius: 1 }}
        />
        <Typography variant='body2' sx={{ mt: 1 }}>
          {progressPercent.toFixed(0)}%
        </Typography>
      </Box>

      <List>
        {steps.map((step, index) => (
          <ListItem key={index} dense>
            <ListItemIcon>
              {step.completed ? (
                <CheckCircleIcon color='success' />
              ) : (
                <RadioButtonUncheckedIcon color='disabled' />
              )}
            </ListItemIcon>
            <ListItemText
              primary={step.label}
              primaryTypographyProps={{
                color: step.completed ? 'text.primary' : 'text.secondary',
              }}
            />
          </ListItem>
        ))}
      </List>

      {progress.skippedRows > 0 && (
        <Typography variant='body2' color='warning.main' sx={{ mt: 2 }}>
          {progress.skippedRows} rows skipped due to duplicates or errors
        </Typography>
      )}

      {progress.duration && (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Time elapsed: {(progress.duration / 1000).toFixed(1)} seconds
        </Typography>
      )}
    </Box>
  );
};

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { ValidationError } from '../../types/import-export';

interface ValidationErrorsProps {
  errors: ValidationError[];
  maxDisplay?: number;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors, maxDisplay = 10 }) => {
  const [expanded, setExpanded] = React.useState(false);

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const displayErrors = expanded ? errors : errors.slice(0, maxDisplay);
  const hasMore = errors.length > maxDisplay;

  if (errors.length === 0) {
    return null;
  }

  return (
    <Alert
      severity={errorCount > 0 ? 'error' : 'warning'}
      sx={{ mb: 2 }}
      action={
        hasMore && (
          <IconButton aria-label='expand' size='small' onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )
      }
    >
      <AlertTitle>
        Validation Issues Found
        <Box component='span' sx={{ ml: 2 }}>
          {errorCount > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${errorCount} Error${errorCount !== 1 ? 's' : ''}`}
              color='error'
              size='small'
              sx={{ mr: 1 }}
            />
          )}
          {warningCount > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${warningCount} Warning${warningCount !== 1 ? 's' : ''}`}
              color='warning'
              size='small'
            />
          )}
        </Box>
      </AlertTitle>

      <List dense>
        {displayErrors.map((error, index) => (
          <ListItem key={index} sx={{ pl: 0 }}>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {error.severity === 'error' ? (
                    <ErrorIcon color='error' fontSize='small' />
                  ) : (
                    <WarningIcon color='warning' fontSize='small' />
                  )}
                  <Typography variant='body2'>
                    Row {error.row}, Column "{error.column}"
                  </Typography>
                </Box>
              }
              secondary={
                <Typography variant='body2' color='text.secondary'>
                  {error.message}
                  {error.value !== undefined && (
                    <> (value: "{String(error.value).substring(0, 50)}")</>
                  )}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      {hasMore && !expanded && (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          ... and {errors.length - maxDisplay} more issues
        </Typography>
      )}
    </Alert>
  );
};

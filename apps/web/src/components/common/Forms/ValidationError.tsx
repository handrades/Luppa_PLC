import React from 'react';
import { Alert, AlertTitle, Box, List, ListItem, ListItemText } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export interface ValidationErrorProps {
  errors?: string | string[] | Record<string, string[]>;
  title?: string;
  severity?: 'error' | 'warning';
  compact?: boolean;
}

/**
 * ValidationError component for displaying form validation errors
 * Can handle single errors, arrays of errors, or nested error objects
 */
export const ValidationError: React.FC<ValidationErrorProps> = ({
  errors,
  title = 'Validation Error',
  severity = 'error',
  compact = false,
}) => {
  if (!errors) return null;

  const formatErrors = (): string[] => {
    if (typeof errors === 'string') {
      return [errors];
    }

    if (Array.isArray(errors)) {
      return errors.filter(e => e);
    }

    // Handle object of errors (e.g., from form validation)
    const errorList: string[] = [];
    Object.entries(errors).forEach(([field, error]) => {
      if (typeof error === 'string') {
        errorList.push(`${field}: ${error}`);
      } else if (error?.message) {
        errorList.push(`${field}: ${error.message}`);
      } else if (Array.isArray(error)) {
        error.forEach(e => {
          if (typeof e === 'string') {
            errorList.push(`${field}: ${e}`);
          }
        });
      }
    });
    return errorList;
  };

  const errorMessages = formatErrors();

  if (errorMessages.length === 0) return null;

  if (compact && errorMessages.length === 1) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: severity === 'error' ? 'error.main' : 'warning.main',
          fontSize: '0.875rem',
          mt: 0.5,
        }}
        role='alert'
        aria-live='polite'
      >
        <ErrorOutlineIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
        {errorMessages[0]}
      </Box>
    );
  }

  return (
    <Alert
      severity={severity}
      icon={<ErrorOutlineIcon />}
      sx={{
        mt: 2,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
      role='alert'
      aria-live='polite'
    >
      {errorMessages.length > 1 && <AlertTitle>{title}</AlertTitle>}
      {errorMessages.length === 1 ? (
        errorMessages[0]
      ) : (
        <List dense sx={{ p: 0, m: 0 }}>
          {errorMessages.map((error, index) => (
            <ListItem key={index} sx={{ p: 0, pl: 2 }}>
              <ListItemText
                primary={`• ${error}`}
                primaryTypographyProps={{
                  variant: 'body2',
                  component: 'span',
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Alert>
  );
};

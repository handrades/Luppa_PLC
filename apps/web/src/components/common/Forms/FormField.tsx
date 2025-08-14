import React from 'react';
import { Box, BoxProps, FormControl, FormHelperText, FormLabel } from '@mui/material';

export interface FormFieldProps extends BoxProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

/**
 * FormField wrapper component that provides consistent styling and layout
 * for all form inputs across the application
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required = false,
  fullWidth = true,
  children,
  htmlFor,
  ...boxProps
}) => {
  return (
    <Box {...boxProps}>
      <FormControl fullWidth={fullWidth} error={!!error}>
        {label && (
          <FormLabel
            htmlFor={htmlFor}
            required={required}
            sx={{
              mb: 1,
              fontWeight: 500,
              '& .MuiFormLabel-asterisk': {
                color: 'error.main',
              },
            }}
          >
            {label}
          </FormLabel>
        )}
        {children}
        {(error || helperText) && (
          <FormHelperText id={htmlFor ? `${htmlFor}-helper-text` : undefined} error={!!error}>
            {error || helperText}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

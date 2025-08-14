import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { FormField, FormFieldProps } from './FormField';

export interface TextInputProps extends Omit<TextFieldProps, 'error'> {
  error?: string;
  fieldProps?: Omit<FormFieldProps, 'children'>;
}

/**
 * TextInput component with consistent styling and validation support
 * Wraps Material-UI TextField with FormField for consistent layout
 */
export const TextInput: React.FC<TextInputProps> = ({
  error,
  required,
  label,
  helperText,
  fieldProps,
  id,
  ...textFieldProps
}) => {
  const hasError = !!error;

  return (
    <FormField
      label={label as string}
      error={error}
      helperText={helperText as string}
      required={required}
      htmlFor={id}
      {...fieldProps}
    >
      <TextField
        {...textFieldProps}
        id={id}
        error={hasError}
        fullWidth
        variant='outlined'
        size='medium'
        sx={{
          '& .MuiInputBase-root': {
            minHeight: '48px', // Touch-friendly size
          },
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
            '&.Mui-error fieldset': {
              borderColor: 'error.main',
              borderWidth: 2,
            },
          },
          ...textFieldProps.sx,
        }}
        inputProps={{
          'aria-label': textFieldProps['aria-label'] || (label as string),
          'aria-required': required,
          'aria-invalid': hasError,
          'aria-describedby': error ? `${id}-helper-text` : undefined,
          ...textFieldProps.inputProps,
        }}
      />
    </FormField>
  );
};

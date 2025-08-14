import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { FormField, FormFieldProps } from './FormField';

export interface NumberInputProps extends Omit<TextFieldProps, 'error' | 'type'> {
  error?: string;
  fieldProps?: Omit<FormFieldProps, 'children'>;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * NumberInput component with number validation and formatting
 * Ensures proper number input handling with min/max constraints
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  error,
  required,
  label,
  helperText,
  fieldProps,
  id,
  min,
  max,
  step = 1,
  onChange,
  ...textFieldProps
}) => {
  const hasError = !!error;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Allow empty string for clearing the field
    if (value === '') {
      onChange?.(event);
      return;
    }

    // Validate number format
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Check min/max constraints
      if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
        return; // Don't update if out of range
      }
      onChange?.(event);
    }
  };

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
        type='number'
        error={hasError}
        fullWidth
        variant='outlined'
        size='medium'
        onChange={handleChange}
        inputProps={{
          min,
          max,
          step,
          inputMode: 'numeric',
          pattern: '[0-9]*',
          'aria-label': textFieldProps['aria-label'] || (label as string),
          'aria-required': required,
          'aria-invalid': hasError,
          'aria-describedby': error ? `${id}-helper-text` : undefined,
          'aria-valuemin': min,
          'aria-valuemax': max,
          ...textFieldProps.inputProps,
        }}
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
          // Hide spinner buttons on webkit browsers
          '& input[type=number]': {
            MozAppearance: 'textfield',
          },
          '& input[type=number]::-webkit-outer-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          '& input[type=number]::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
          ...textFieldProps.sx,
        }}
      />
    </FormField>
  );
};

import React from 'react';
import {
  DatePicker as MuiDatePicker,
  DatePickerProps as MuiDatePickerProps,
} from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextField } from '@mui/material';
import { FormField, FormFieldProps } from './FormField';

// @ts-expect-error - MUI DatePicker generic constraint
export interface DatePickerProps extends Omit<MuiDatePickerProps<Date>, 'renderInput'> {
  error?: string;
  helperText?: string;
  required?: boolean;
  fieldProps?: Omit<FormFieldProps, 'children'>;
  id?: string;
}

/**
 * DatePicker component using @mui/x-date-pickers
 * Provides touch-friendly date selection with validation support
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  error,
  helperText,
  required,
  label,
  fieldProps,
  id,
  value,
  onChange,
  disabled,
  readOnly,
  ...datePickerProps
}) => {
  const hasError = !!error;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <FormField
        label={label as string}
        error={error}
        helperText={helperText}
        required={required}
        htmlFor={id}
        {...fieldProps}
      >
        <MuiDatePicker
          {...datePickerProps}
          value={value}
          onChange={onChange}
          disabled={disabled}
          readOnly={readOnly}
          // TODO: Remove in future version for better accessibility
          enableAccessibleFieldDOMStructure={false}
          slots={{
            textField: TextField,
          }}
          slotProps={{
            textField: {
              id,
              fullWidth: true,
              variant: 'outlined',
              error: hasError,
              sx: {
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
              },
              inputProps: {
                'aria-label': label as string,
                'aria-required': required,
                'aria-invalid': hasError,
                'aria-describedby': error ? `${id}-helper-text` : undefined,
              },
            },
            actionBar: {
              actions: ['clear', 'today', 'accept'],
            },
            // Mobile-friendly dialog
            mobilePaper: {
              sx: {
                '.MuiPickersDay-root': {
                  minHeight: '48px',
                  minWidth: '48px',
                },
              },
            },
            desktopPaper: {
              sx: {
                '.MuiPickersDay-root': {
                  minHeight: '40px',
                  minWidth: '40px',
                },
              },
            },
          }}
        />
      </FormField>
    </LocalizationProvider>
  );
};

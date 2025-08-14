import React from 'react';
import { Box, Checkbox, Chip, ListItemText, MenuItem, Select, SelectProps } from '@mui/material';
import { FormField, FormFieldProps } from './FormField';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectProps, 'error'> {
  options: SelectOption[];
  error?: string;
  fieldProps?: Omit<FormFieldProps, 'children'>;
  emptyOptionLabel?: string;
  showEmptyOption?: boolean;
}

/**
 * SelectField component with Material-UI Select integration
 * Supports single and multiple selection with consistent styling
 */
export const SelectField: React.FC<SelectFieldProps> = ({
  options,
  error,
  required,
  label,
  fieldProps,
  id,
  multiple = false,
  value,
  emptyOptionLabel = 'None',
  showEmptyOption = false,
  renderValue,
  ...selectProps
}) => {
  const hasError = !!error;

  const defaultRenderValue = (selected: unknown): React.ReactNode => {
    if (multiple && Array.isArray(selected)) {
      if (selected.length === 0) return <em>Select options...</em>;
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selected.map(val => {
            const option = options.find(opt => opt.value === val);
            return <Chip key={String(val)} label={option?.label || String(val)} size='small' />;
          })}
        </Box>
      );
    }
    const option = options.find(opt => opt.value === selected);
    return option?.label || String(selected || '') || <em>Select an option...</em>;
  };

  return (
    <FormField
      label={label as string}
      error={error}
      required={required}
      htmlFor={id}
      {...fieldProps}
    >
      <Select
        {...selectProps}
        id={id}
        value={value || (multiple ? [] : '')}
        error={hasError}
        fullWidth
        variant='outlined'
        multiple={multiple}
        displayEmpty
        renderValue={renderValue || defaultRenderValue}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 48 * 4.5 + 8,
            },
          },
        }}
        sx={{
          minHeight: '48px', // Touch-friendly size
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : undefined,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : 'primary.main',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : 'primary.main',
            borderWidth: 2,
          },
          ...selectProps.sx,
        }}
        inputProps={{
          'aria-label': selectProps['aria-label'] || (label as string),
          'aria-required': required,
          'aria-invalid': hasError,
          'aria-describedby': error ? `${id}-helper-text` : undefined,
        }}
      >
        {showEmptyOption && !multiple && (
          <MenuItem value=''>
            <em>{emptyOptionLabel}</em>
          </MenuItem>
        )}
        {options.map(option => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{
              minHeight: '48px', // Touch-friendly size
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
              },
            }}
          >
            {multiple ? (
              <>
                <Checkbox
                  checked={Array.isArray(value) && value.includes(option.value)}
                  size='small'
                />
                <ListItemText primary={option.label} />
              </>
            ) : (
              option.label
            )}
          </MenuItem>
        ))}
      </Select>
    </FormField>
  );
};

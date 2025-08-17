/**
 * IP Address Input Component for Equipment Forms
 * Story 4.4: Equipment Form UI - Task 6
 *
 * Provides IP address input with format validation, uniqueness checking,
 * and proper accessibility support.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import { Check, ContentCopy, Error, Router, Warning } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';

import { equipmentQueryKeys, equipmentService } from '../../services/equipment.service';
import type { IpAddressInputProps } from '../../types/equipment-form';
import { EQUIPMENT_FORM_CONSTRAINTS } from '../../types/equipment-form';
import { equipmentFieldSchema } from '../../validation/equipment.schema';

/**
 * IP Address Input Component
 *
 * Features:
 * - IPv4 format validation with visual feedback
 * - Async uniqueness validation with debouncing
 * - Copy to clipboard functionality
 * - Loading states during validation
 * - Accessibility support with proper ARIA attributes
 * - Clear error messaging for different validation states
 */
const IpAddressInput: React.FC<IpAddressInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  label = 'IP Address',
  placeholder = '192.168.1.100',
  excludeEquipmentId,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce the IP value for uniqueness checking
  const debouncedSetValue = useMemo(
    () =>
      debounce((newValue: string) => {
        setDebouncedValue(newValue);
      }, EQUIPMENT_FORM_CONSTRAINTS.VALIDATION_DEBOUNCE_MS),
    []
  );

  // Update debounced value when input value changes
  useEffect(() => {
    debouncedSetValue(value);
    return () => {
      debouncedSetValue.cancel();
    };
  }, [value, debouncedSetValue]);

  // Validate IP format
  const formatValidation = useMemo(() => {
    if (!value || value.trim() === '') {
      return { isValid: true, error: null };
    }

    const result = equipmentFieldSchema.ipAddress.safeParse(value);
    if (!result.success) {
      return {
        isValid: false,
        error: result.error.issues[0]?.message || 'Invalid IP address format',
      };
    }

    return { isValid: true, error: null };
  }, [value]);

  // Query for IP uniqueness validation
  const {
    data: isUnique,
    isLoading: isValidatingUniqueness,
    error: uniquenessError,
  } = useQuery({
    queryKey: equipmentQueryKeys.ipValidation(debouncedValue, excludeEquipmentId),
    queryFn: () => equipmentService.checkIpUniqueness(debouncedValue, excludeEquipmentId),
    enabled: Boolean(
      debouncedValue &&
        debouncedValue.trim() !== '' &&
        formatValidation.isValid &&
        debouncedValue === value // Only validate when not typing
    ),
    staleTime: 30 * 1000, // Cache for 30 seconds
    retry: 1,
  });

  // Determine validation state
  const validationState = useMemo(() => {
    // If there's an external error, show it
    if (error) {
      return {
        status: 'error' as const,
        message: error,
        icon: <Error color='error' />,
      };
    }

    // If empty and not required, it's valid
    if (!value || value.trim() === '') {
      if (required) {
        return {
          status: 'error' as const,
          message: 'IP address is required',
          icon: <Error color='error' />,
        };
      }
      return {
        status: 'neutral' as const,
        message: '',
        icon: null,
      };
    }

    // Check format validation
    if (!formatValidation.isValid) {
      return {
        status: 'error' as const,
        message: formatValidation.error || 'Invalid IP address format',
        icon: <Error color='error' />,
      };
    }

    // Check uniqueness validation
    if (isValidatingUniqueness) {
      return {
        status: 'validating' as const,
        message: 'Checking availability...',
        icon: <CircularProgress size={16} />,
      };
    }

    if (uniquenessError) {
      return {
        status: 'warning' as const,
        message: 'Unable to verify uniqueness',
        icon: <Warning color='warning' />,
      };
    }

    if (isUnique === false) {
      return {
        status: 'error' as const,
        message: 'This IP address is already in use',
        icon: <Error color='error' />,
      };
    }

    if (isUnique === true) {
      return {
        status: 'success' as const,
        message: 'IP address is available',
        icon: <Check color='success' />,
      };
    }

    // Default neutral state
    return {
      status: 'neutral' as const,
      message: '',
      icon: null,
    };
  }, [error, value, required, formatValidation, isValidatingUniqueness, uniquenessError, isUnique]);

  // Handle input change
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      onChange(newValue);
    },
    [onChange]
  );

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!value || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Failed to copy to clipboard - error handled by user feedback
    }
  }, [value]);

  // Format helper text
  const helperText = useMemo(() => {
    if (validationState.message) {
      return validationState.message;
    }

    if (!value || value.trim() === '') {
      return 'Enter IPv4 address (e.g., 192.168.1.100)';
    }

    return '';
  }, [validationState.message, value]);

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      error={validationState.status === 'error'}
      helperText={helperText}
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position='start'>
            <Router sx={{ color: 'text.secondary' }} />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position='end'>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Validation Status Icon */}
              {validationState.icon && (
                <Tooltip title={validationState.message}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>{validationState.icon}</Box>
                </Tooltip>
              )}

              {/* Copy to Clipboard Button */}
              {value && value.trim() && formatValidation.isValid && !disabled && (
                <Tooltip title={isCopied ? 'Copied!' : 'Copy IP address'}>
                  <IconButton
                    size='small'
                    onClick={handleCopy}
                    edge='end'
                    aria-label='Copy IP address to clipboard'
                  >
                    {isCopied ? (
                      <Check sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <ContentCopy sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </InputAdornment>
        ),
      }}
      inputProps={{
        'aria-label': `${label}${required ? ' (required)' : ''}`,
        'aria-describedby': validationState.message ? `${label}-validation-message` : undefined,
        'aria-invalid': validationState.status === 'error',
        maxLength: 15, // Maximum length for IPv4 (xxx.xxx.xxx.xxx)
        pattern:
          '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
        autoComplete: 'off',
        spellCheck: false,
      }}
      FormHelperTextProps={{
        id: validationState.message ? `${label}-validation-message` : undefined,
        sx: {
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          ...(validationState.status === 'success' && {
            color: 'success.main',
          }),
          ...(validationState.status === 'warning' && {
            color: 'warning.main',
          }),
        },
      }}
    />
  );
};

export default React.memo(IpAddressInput);

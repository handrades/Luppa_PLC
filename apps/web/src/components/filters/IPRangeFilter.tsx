/**
 * IP Range Filter Component
 * Story 5.1: Advanced Filtering System
 *
 * Component for filtering by IP address ranges with CIDR notation
 * support and subnet validation.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  NetworkWifi as NetworkIcon,
} from '@mui/icons-material';

import type { IPRangeFilter as IPRangeFilterType } from '../../types/advanced-filters';

/**
 * Props for IPRangeFilter component
 */
interface IPRangeFilterProps {
  ipRange?: IPRangeFilterType;
  onChange: (ipRange?: IPRangeFilterType) => void;
}

/**
 * Common subnet presets for quick selection
 */
const SUBNET_PRESETS = [
  {
    label: 'Private Class A',
    cidr: '10.0.0.0/8',
    description: '10.0.0.0 - 10.255.255.255',
  },
  {
    label: 'Private Class B',
    cidr: '172.16.0.0/12',
    description: '172.16.0.0 - 172.31.255.255',
  },
  {
    label: 'Private Class C',
    cidr: '192.168.0.0/16',
    description: '192.168.0.0 - 192.168.255.255',
  },
  {
    label: 'Local Subnet',
    cidr: '192.168.1.0/24',
    description: '192.168.1.0 - 192.168.1.255',
  },
  {
    label: 'Link Local',
    cidr: '169.254.0.0/16',
    description: '169.254.0.0 - 169.254.255.255',
  },
];

/**
 * Utility functions for IP address validation and manipulation
 */
const IPUtils = {
  /**
   * Validates IPv4 address format
   */
  isValidIPv4: (ip: string): boolean => {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  },

  /**
   * Validates CIDR notation format
   */
  isValidCIDR: (cidr: string): boolean => {
    const cidrRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
    return cidrRegex.test(cidr);
  },

  /**
   * Converts IP address to numeric value for comparison
   */
  ipToNumber: (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  },

  /**
   * Converts numeric value back to IP address
   */
  numberToIP: (num: number): string => {
    return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
  },

  /**
   * Calculates network range from CIDR notation
   */
  cidrToRange: (cidr: string): { startIP: string; endIP: string; count: number } | null => {
    if (!IPUtils.isValidCIDR(cidr)) return null;

    const [networkIP, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    const networkNum = IPUtils.ipToNumber(networkIP);

    const hostBits = 32 - prefix;
    const networkMask = (0xffffffff << hostBits) >>> 0;
    const hostMask = ~networkMask >>> 0;

    const networkAddress = networkNum & networkMask;
    const broadcastAddress = networkAddress | hostMask;

    return {
      startIP: IPUtils.numberToIP(networkAddress),
      endIP: IPUtils.numberToIP(broadcastAddress),
      count: Math.pow(2, hostBits),
    };
  },

  /**
   * Validates that start IP is less than or equal to end IP
   */
  isValidRange: (startIP: string, endIP: string): boolean => {
    if (!IPUtils.isValidIPv4(startIP) || !IPUtils.isValidIPv4(endIP)) return false;
    return IPUtils.ipToNumber(startIP) <= IPUtils.ipToNumber(endIP);
  },
};

/**
 * IP range filter component
 */
export const IPRangeFilter: React.FC<IPRangeFilterProps> = ({ ipRange, onChange }) => {
  const [filterType, setFilterType] = useState<'cidr' | 'range'>('cidr');
  const [cidrInput, setCidrInput] = useState(ipRange?.cidr || '');
  const [startIPInput, setStartIPInput] = useState(ipRange?.startIP || '');
  const [endIPInput, setEndIPInput] = useState(ipRange?.endIP || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cidrInfo, setCidrInfo] = useState<{
    startIP: string;
    endIP: string;
    count: number;
  } | null>(null);

  // Update local state when props change
  useEffect(() => {
    if (ipRange?.cidr) {
      setFilterType('cidr');
      setCidrInput(ipRange.cidr);
    } else if (ipRange?.startIP && ipRange?.endIP) {
      setFilterType('range');
      setStartIPInput(ipRange.startIP);
      setEndIPInput(ipRange.endIP);
    }
  }, [ipRange]);

  // Validate inputs and update errors
  const validateInputs = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (filterType === 'cidr') {
      if (cidrInput && !IPUtils.isValidCIDR(cidrInput)) {
        newErrors.cidr = 'Invalid CIDR notation format (e.g., 192.168.1.0/24)';
      }
    } else {
      if (startIPInput && !IPUtils.isValidIPv4(startIPInput)) {
        newErrors.startIP = 'Invalid IPv4 address format';
      }
      if (endIPInput && !IPUtils.isValidIPv4(endIPInput)) {
        newErrors.endIP = 'Invalid IPv4 address format';
      }
      if (
        startIPInput &&
        endIPInput &&
        IPUtils.isValidIPv4(startIPInput) &&
        IPUtils.isValidIPv4(endIPInput) &&
        !IPUtils.isValidRange(startIPInput, endIPInput)
      ) {
        newErrors.range = 'Start IP address must be less than or equal to end IP address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [filterType, cidrInput, startIPInput, endIPInput]);

  // Update CIDR information when CIDR input changes
  useEffect(() => {
    if (filterType === 'cidr' && cidrInput && IPUtils.isValidCIDR(cidrInput)) {
      const info = IPUtils.cidrToRange(cidrInput);
      setCidrInfo(info);
    } else {
      setCidrInfo(null);
    }
  }, [filterType, cidrInput]);

  // Handle input changes
  const handleCidrChange = useCallback(
    (value: string) => {
      setCidrInput(value);
      if (value && IPUtils.isValidCIDR(value)) {
        onChange({ cidr: value });
      } else if (!value) {
        onChange(undefined);
      }
    },
    [onChange]
  );

  const handleStartIPChange = useCallback(
    (value: string) => {
      setStartIPInput(value);
      if (value && endIPInput && IPUtils.isValidRange(value, endIPInput)) {
        onChange({ startIP: value, endIP: endIPInput });
      } else if (!value && !endIPInput) {
        onChange(undefined);
      }
    },
    [endIPInput, onChange]
  );

  const handleEndIPChange = useCallback(
    (value: string) => {
      setEndIPInput(value);
      if (startIPInput && value && IPUtils.isValidRange(startIPInput, value)) {
        onChange({ startIP: startIPInput, endIP: value });
      } else if (!startIPInput && !value) {
        onChange(undefined);
      }
    },
    [startIPInput, onChange]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: (typeof SUBNET_PRESETS)[0]) => {
      setFilterType('cidr');
      setCidrInput(preset.cidr);
      onChange({ cidr: preset.cidr });
    },
    [onChange]
  );

  // Handle clear filter
  const handleClear = useCallback(() => {
    setCidrInput('');
    setStartIPInput('');
    setEndIPInput('');
    setErrors({});
    setCidrInfo(null);
    onChange(undefined);
  }, [onChange]);

  // Validate on input changes
  useEffect(() => {
    validateInputs();
  }, [validateInputs]);

  const hasActiveFilter = !!(ipRange?.cidr || (ipRange?.startIP && ipRange?.endIP));

  return (
    <FormControl fullWidth>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <FormLabel
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          IP Address Range Filter
        </FormLabel>
        {hasActiveFilter && (
          <Button size='small' startIcon={<ClearIcon />} onClick={handleClear} color='secondary'>
            Clear
          </Button>
        )}
      </Box>

      {/* Filter type selection */}
      <Box display='flex' gap={1} mb={2}>
        <Button
          variant={filterType === 'cidr' ? 'contained' : 'outlined'}
          onClick={() => setFilterType('cidr')}
          size='small'
          startIcon={<NetworkIcon />}
        >
          CIDR Notation
        </Button>
        <Button
          variant={filterType === 'range' ? 'contained' : 'outlined'}
          onClick={() => setFilterType('range')}
          size='small'
          startIcon={<CalculateIcon />}
        >
          IP Range
        </Button>
      </Box>

      {/* Subnet presets */}
      <Box mb={2}>
        <Typography variant='body2' color='textSecondary' gutterBottom>
          Common Subnets:
        </Typography>
        <Box display='flex' flexWrap='wrap' gap={0.5}>
          {SUBNET_PRESETS.map(preset => (
            <Tooltip key={preset.cidr} title={preset.description}>
              <Chip
                label={preset.label}
                size='small'
                variant='outlined'
                clickable
                onClick={() => handlePresetSelect(preset)}
                sx={{ fontSize: '0.75rem' }}
              />
            </Tooltip>
          ))}
        </Box>
      </Box>

      {/* CIDR input */}
      {filterType === 'cidr' && (
        <Box>
          <TextField
            fullWidth
            size='small'
            label='CIDR Notation'
            placeholder='e.g., 192.168.1.0/24'
            value={cidrInput}
            onChange={e => handleCidrChange(e.target.value)}
            error={!!errors.cidr}
            helperText={errors.cidr || 'Enter network address with prefix length'}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <NetworkIcon />
                </InputAdornment>
              ),
              endAdornment: cidrInput && (
                <InputAdornment position='end'>
                  <Tooltip title='Network information'>
                    <IconButton size='small'>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />

          {/* CIDR information display */}
          {cidrInfo && (
            <Paper
              variant='outlined'
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: 'info.50',
                borderColor: 'info.200',
              }}
            >
              <Typography variant='body2' fontWeight={500} gutterBottom>
                Network Information:
              </Typography>
              <Typography variant='body2' color='textSecondary'>
                <strong>Range:</strong> {cidrInfo.startIP} - {cidrInfo.endIP}
              </Typography>
              <Typography variant='body2' color='textSecondary'>
                <strong>Host Count:</strong> {cidrInfo.count.toLocaleString()} addresses
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* IP range inputs */}
      {filterType === 'range' && (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size='small'
                label='Start IP Address'
                placeholder='e.g., 192.168.1.1'
                value={startIPInput}
                onChange={e => handleStartIPChange(e.target.value)}
                error={!!errors.startIP}
                helperText={errors.startIP || 'First IP address in range'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size='small'
                label='End IP Address'
                placeholder='e.g., 192.168.1.100'
                value={endIPInput}
                onChange={e => handleEndIPChange(e.target.value)}
                error={!!errors.endIP}
                helperText={errors.endIP || 'Last IP address in range'}
              />
            </Grid>
          </Grid>

          {/* Range validation error */}
          {errors.range && (
            <Alert severity='error' sx={{ mt: 2, fontSize: '0.875rem' }}>
              {errors.range}
            </Alert>
          )}

          {/* Range information display */}
          {startIPInput &&
            endIPInput &&
            IPUtils.isValidIPv4(startIPInput) &&
            IPUtils.isValidIPv4(endIPInput) &&
            IPUtils.isValidRange(startIPInput, endIPInput) && (
              <Paper
                variant='outlined'
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: 'success.50',
                  borderColor: 'success.200',
                }}
              >
                <Typography variant='body2' fontWeight={500} gutterBottom>
                  IP Range Information:
                </Typography>
                <Typography variant='body2' color='textSecondary'>
                  <strong>Range:</strong> {startIPInput} - {endIPInput}
                </Typography>
                <Typography variant='body2' color='textSecondary'>
                  <strong>Address Count:</strong>{' '}
                  {(
                    IPUtils.ipToNumber(endIPInput) -
                    IPUtils.ipToNumber(startIPInput) +
                    1
                  ).toLocaleString()}
                </Typography>
              </Paper>
            )}
        </Box>
      )}

      {/* General helper text */}
      <FormHelperText sx={{ mt: 1 }}>
        Filter equipment by IP address using CIDR notation (recommended) or specific IP ranges. This
        will match equipment with IP addresses within the specified network range.
      </FormHelperText>
    </FormControl>
  );
};

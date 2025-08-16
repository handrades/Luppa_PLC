/**
 * EquipmentEmptyState Component
 * Story 4.3: Equipment List UI
 *
 * Displays helpful empty state messages for equipment list
 * Handles both "no data" and "no search results" scenarios
 */

import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Inventory2Outlined as InventoryIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { EquipmentEmptyStateProps } from '../../types/equipment';

/**
 * Equipment Empty State Component
 *
 * @param props - Component props
 * @returns Empty state component
 */
export const EquipmentEmptyState = React.memo<EquipmentEmptyStateProps>(
  ({ hasFilters, onClearFilters, onAddEquipment }) => {
    const theme = useTheme();

    // Determine the appropriate icon and messages based on state
    const icon = hasFilters ? SearchOffIcon : InventoryIcon;
    const title = hasFilters ? 'No equipment found' : 'No equipment available';
    const subtitle = hasFilters
      ? 'Try adjusting your search criteria or filters to find equipment.'
      : 'Get started by adding your first piece of equipment to the system.';

    return (
      <Paper
        elevation={0}
        role='region'
        aria-label={hasFilters ? 'No search results' : 'No equipment data'}
        sx={{
          p: 6,
          textAlign: 'center',
          backgroundColor: theme.palette.grey[50],
          border: `1px dashed ${theme.palette.grey[300]}`,
          borderRadius: 2,
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={3} alignItems='center' maxWidth={480}>
          {/* Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.palette.grey[200],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            {React.createElement(icon, {
              sx: {
                fontSize: 40,
                color: theme.palette.grey[500],
              },
            })}
          </Box>

          {/* Title */}
          <Typography
            variant='h5'
            component='h3'
            color='text.primary'
            fontWeight={600}
            gutterBottom
          >
            {title}
          </Typography>

          {/* Subtitle */}
          <Typography variant='body1' color='text.secondary' sx={{ lineHeight: 1.6 }}>
            {subtitle}
          </Typography>

          {/* Action Buttons */}
          <Stack direction='row' spacing={2} sx={{ mt: 3 }}>
            {hasFilters && (
              <Button
                variant='outlined'
                startIcon={<ClearIcon />}
                onClick={onClearFilters}
                sx={{
                  borderColor: theme.palette.grey[300],
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    borderColor: theme.palette.grey[400],
                    backgroundColor: theme.palette.grey[50],
                  },
                }}
              >
                Clear Filters
              </Button>
            )}

            {onAddEquipment && (
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={onAddEquipment}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                {hasFilters ? 'Add Equipment' : 'Add First Equipment'}
              </Button>
            )}
          </Stack>

          {/* Additional Help Text */}
          {!hasFilters && (
            <Box
              sx={{
                mt: 4,
                p: 3,
                backgroundColor: theme.palette.grey[100],
                borderRadius: 1,
              }}
            >
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <strong>Getting Started:</strong>
              </Typography>
              <Typography variant='body2' color='text.secondary' component='div'>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Add PLCs, robots, conveyors, and other industrial equipment</li>
                  <li>Organize equipment by site and cell hierarchy</li>
                  <li>Track PLC details including IP addresses, makes, and models</li>
                  <li>Use tags for easy searching and categorization</li>
                </ul>
              </Typography>
            </Box>
          )}

          {/* Search Help for Filtered State */}
          {hasFilters && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                <strong>Search Tips:</strong>
              </Typography>
              <Typography variant='body2' color='text.secondary' component='div'>
                <ul style={{ margin: 0, paddingLeft: 20, textAlign: 'left' }}>
                  <li>Search by equipment description, make, or model</li>
                  <li>Filter by site name or cell type</li>
                  <li>Look for specific IP addresses or PLC tags</li>
                  <li>Try using partial matches (e.g., "Allen" for "Allen-Bradley")</li>
                </ul>
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    );
  }
);

export default EquipmentEmptyState;

/**
 * EquipmentActions Component
 * Story 4.3: Equipment List UI
 *
 * Bulk action toolbar component for selected equipment items
 * Provides actions for export, delete, and selection management
 */

import React from 'react';
import {
  Box,
  Button,
  Chip,
  Fade,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { EquipmentActionsProps } from '../../types/equipment';

/**
 * Equipment Actions Toolbar Component
 *
 * @param props - Component props
 * @returns Actions toolbar component
 */
export const EquipmentActions = React.memo<EquipmentActionsProps>(
  ({ selectedCount, onExport, onDelete, onClearSelection }) => {
    const theme = useTheme();

    // Don't render if no items are selected
    if (selectedCount === 0) {
      return null;
    }

    return (
      <Fade in={selectedCount > 0}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.primary.contrastText,
            border: `1px solid ${theme.palette.primary.main}`,
            borderRadius: 2,
          }}
        >
          <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
            {/* Selection Info */}
            <Stack direction='row' alignItems='center' spacing={2}>
              <Chip
                label={`${selectedCount} selected`}
                size='small'
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontWeight: 600,
                }}
              />

              <Typography variant='body2' color='inherit'>
                {selectedCount === 1 ? 'equipment item selected' : 'equipment items selected'}
              </Typography>
            </Stack>

            {/* Action Buttons */}
            <Stack direction='row' alignItems='center' spacing={1}>
              {/* Export Button */}
              {onExport && (
                <Tooltip title='Export selected equipment to CSV'>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<ExportIcon />}
                    onClick={onExport}
                    sx={{
                      borderColor: theme.palette.primary.contrastText,
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        borderColor: theme.palette.primary.contrastText,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Export
                  </Button>
                </Tooltip>
              )}

              {/* Delete Button */}
              {onDelete && (
                <Tooltip title='Delete selected equipment'>
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<DeleteIcon />}
                    onClick={onDelete}
                    color='error'
                    sx={{
                      borderColor: theme.palette.error.light,
                      color: theme.palette.error.light,
                      '&:hover': {
                        borderColor: theme.palette.error.light,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}

              {/* More Actions Button (for future use) */}
              <Tooltip title='More actions'>
                <IconButton
                  size='small'
                  aria-label='More bulk actions for selected equipment'
                  sx={{
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <MoreIcon />
                </IconButton>
              </Tooltip>

              {/* Clear Selection Button */}
              <Tooltip title='Clear selection'>
                <IconButton
                  size='small'
                  onClick={onClearSelection}
                  aria-label='Clear equipment selection'
                  sx={{
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Additional Info Row for Large Selections */}
          {selectedCount > 10 && (
            <Box
              sx={{
                mt: 1,
                pt: 1,
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Typography variant='caption' color='inherit' sx={{ opacity: 0.8 }}>
                💡 Tip: Large selections may take longer to process. Consider exporting in smaller
                batches.
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    );
  }
);

/**
 * Compact version of the actions toolbar
 * Useful for mobile views or constrained spaces
 */
export const EquipmentActionsCompact = React.memo<EquipmentActionsProps>(
  ({ selectedCount, onExport, onDelete, onClearSelection }) => {
    const theme = useTheme();

    if (selectedCount === 0) {
      return null;
    }

    return (
      <Fade in={selectedCount > 0}>
        <Box
          sx={{
            p: 1,
            mb: 1,
            backgroundColor: theme.palette.primary.light,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant='body2' color='primary.contrastText'>
            {selectedCount} selected
          </Typography>

          <Stack direction='row' spacing={0.5}>
            {onExport && (
              <Tooltip title='Export'>
                <IconButton
                  size='small'
                  onClick={onExport}
                  color='inherit'
                  aria-label='Export selected equipment'
                >
                  <ExportIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip title='Delete'>
                <IconButton
                  size='small'
                  onClick={onDelete}
                  color='error'
                  aria-label='Delete selected equipment'
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title='Clear'>
              <IconButton
                size='small'
                onClick={onClearSelection}
                color='inherit'
                aria-label='Clear equipment selection'
              >
                <CloseIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Fade>
    );
  }
);

export default EquipmentActions;

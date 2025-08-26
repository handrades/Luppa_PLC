/**
 * Import Preview Component
 *
 * Displays first 10 rows of CSV with validation status indicators,
 * row-level error display, and validation summary.
 */

import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useImportState } from '../../stores/importExport.store';
import type { RowValidationError, ValidationError } from '../../stores/importExport.store';

interface ImportPreviewProps {
  onRowSelect?: (rowIndex: number) => void;
  maxRows?: number;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({ onRowSelect, maxRows = 10 }) => {
  const { previewData, validationResult } = useImportState();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedSummary, setExpandedSummary] = useState(false);

  if (!validationResult || previewData.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant='body1' color='text.secondary'>
          No preview data available
        </Typography>
      </Box>
    );
  }

  const { headerErrors, rowErrors } = validationResult;
  const previewRows = previewData.slice(0, maxRows);

  // Group errors by row
  const errorsByRow = new Map<number, ValidationError[]>();
  rowErrors.forEach((rowError: RowValidationError) => {
    errorsByRow.set(rowError.row, rowError.errors);
  });

  // Get validation status for a row
  const getRowStatus = (rowIndex: number) => {
    const adjustedRowIndex = rowIndex + 2; // Adjust for header and 1-based indexing
    const rowErrorList = errorsByRow.get(adjustedRowIndex);

    if (!rowErrorList || rowErrorList.length === 0) {
      return 'success';
    }

    const hasErrors = rowErrorList.some(err => err.severity === 'error');
    return hasErrors ? 'error' : 'warning';
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color='success' fontSize='small' />;
      case 'error':
        return <ErrorIcon color='error' fontSize='small' />;
      case 'warning':
        return <WarningIcon color='warning' fontSize='small' />;
      default:
        return <InfoIcon color='info' fontSize='small' />;
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (rowIndex: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowIndex)) {
      newExpandedRows.delete(rowIndex);
    } else {
      newExpandedRows.add(rowIndex);
    }
    setExpandedRows(newExpandedRows);
  };

  // Handle row click
  const handleRowClick = (rowIndex: number) => {
    onRowSelect?.(rowIndex);
  };

  // Get table headers
  const headers = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  // Calculate validation summary
  const totalRows = previewData.length;
  const errorCount = rowErrors.filter(re => re.errors.some(e => e.severity === 'error')).length;
  const warningCount = rowErrors.filter(
    re =>
      re.errors.some(e => e.severity === 'warning') && !re.errors.some(e => e.severity === 'error')
  ).length;
  const successCount = totalRows - errorCount - warningCount;

  return (
    <Box>
      {/* Validation Summary */}
      <Paper variant='outlined' sx={{ mb: 2, p: 2 }}>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography variant='h6'>
            Import Preview ({previewRows.length} of {totalRows} rows)
          </Typography>
          <IconButton
            onClick={() => setExpandedSummary(!expandedSummary)}
            size='small'
            sx={{
              transform: expandedSummary ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Stack>

        <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${successCount} Valid`}
            color='success'
            variant='outlined'
            size='small'
          />
          {warningCount > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${warningCount} Warnings`}
              color='warning'
              variant='outlined'
              size='small'
            />
          )}
          {errorCount > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${errorCount} Errors`}
              color='error'
              variant='outlined'
              size='small'
            />
          )}
        </Stack>

        <Collapse in={expandedSummary}>
          <Box sx={{ mt: 2 }}>
            {headerErrors.length > 0 && (
              <Alert severity='error' sx={{ mb: 2 }}>
                <Typography variant='body2' fontWeight='medium'>
                  Header Issues:
                </Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {headerErrors.map((error, index) => (
                    <li key={index}>
                      <Typography variant='body2'>{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            <Typography variant='body2' color='text.secondary'>
              Review the table below for detailed row-by-row validation results. Click on rows with
              issues to see specific error messages.
            </Typography>
          </Box>
        </Collapse>
      </Paper>

      {/* Preview Table */}
      <TableContainer component={Paper} variant='outlined'>
        <Table size='small' stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={60} align='center'>
                Status
              </TableCell>
              <TableCell width={60} align='center'>
                Row
              </TableCell>
              {headers.map(header => (
                <TableCell key={header} sx={{ minWidth: 120 }}>
                  <Typography variant='body2' fontWeight='medium'>
                    {header}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewRows.map((row, rowIndex) => {
              const status = getRowStatus(rowIndex);
              const adjustedRowIndex = rowIndex + 2;
              const rowErrorList = errorsByRow.get(adjustedRowIndex);
              const hasErrors = rowErrorList && rowErrorList.length > 0;
              const isExpanded = expandedRows.has(rowIndex);

              return (
                <React.Fragment key={rowIndex}>
                  <TableRow
                    hover
                    onClick={() => handleRowClick(rowIndex)}
                    sx={{
                      cursor: hasErrors ? 'pointer' : 'default',
                      backgroundColor:
                        status === 'error'
                          ? 'error.lighter'
                          : status === 'warning'
                            ? 'warning.lighter'
                            : 'transparent',
                      '&:hover': {
                        backgroundColor: hasErrors
                          ? status === 'error'
                            ? 'error.light'
                            : 'warning.light'
                          : 'action.hover',
                      },
                    }}
                  >
                    <TableCell align='center'>
                      {hasErrors ? (
                        <Tooltip title={`${rowErrorList.length} issue(s)`}>
                          <IconButton
                            size='small'
                            onClick={e => {
                              e.stopPropagation();
                              toggleRowExpansion(rowIndex);
                            }}
                          >
                            <Badge badgeContent={rowErrorList.length} color='error'>
                              {getStatusIcon(status)}
                            </Badge>
                          </IconButton>
                        </Tooltip>
                      ) : (
                        getStatusIcon(status)
                      )}
                    </TableCell>
                    <TableCell align='center'>
                      <Typography variant='body2' color='text.secondary'>
                        {adjustedRowIndex}
                      </Typography>
                    </TableCell>
                    {headers.map(header => (
                      <TableCell key={header}>
                        <Typography
                          variant='body2'
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row[header] || '-'}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Error Details Row */}
                  {hasErrors && (
                    <TableRow>
                      <TableCell
                        colSpan={headers.length + 2}
                        sx={{ paddingTop: 0, paddingBottom: 0 }}
                      >
                        <Collapse in={isExpanded}>
                          <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                            <Typography variant='body2' fontWeight='medium' sx={{ mb: 1 }}>
                              Validation Issues for Row {adjustedRowIndex}:
                            </Typography>
                            <Stack spacing={1}>
                              {rowErrorList?.map((error, errorIndex) => (
                                <Alert
                                  key={errorIndex}
                                  severity={error.severity}
                                  variant='outlined'
                                >
                                  <Typography variant='body2'>
                                    <strong>{error.field}:</strong> {error.error}
                                    {error.value !== null && error.value !== undefined && (
                                      <span style={{ color: 'text.secondary' }}>
                                        {' '}
                                        (Value: "{String(error.value)}")
                                      </span>
                                    )}
                                  </Typography>
                                </Alert>
                              ))}
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Show more indicator */}
      {totalRows > maxRows && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            Showing first {maxRows} of {totalRows} rows.
            {errorCount > 0 || warningCount > 0
              ? ' Fix validation issues before proceeding.'
              : ' All rows validated successfully.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ImportPreview;

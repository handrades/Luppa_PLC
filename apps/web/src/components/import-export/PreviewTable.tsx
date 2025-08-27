import React from 'react';
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { ImportPreview, ValidationError } from '../../types/import-export';

interface PreviewTableProps {
  preview: ImportPreview;
  errors: ValidationError[];
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ preview, errors }) => {
  const getRowErrors = (rowIndex: number) => {
    return errors.filter(error => error.row === rowIndex + 1);
  };

  const getCellError = (rowIndex: number, column: string) => {
    return errors.find(error => error.row === rowIndex + 1 && error.column === column);
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size='small'>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 50 }}>Row</TableCell>
            {preview.headers.map((header, index) => (
              <TableCell key={index}>{header}</TableCell>
            ))}
            <TableCell sx={{ width: 100 }}>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {preview.rows.map((row, rowIndex) => {
            const rowErrors = getRowErrors(rowIndex);
            const hasErrors = rowErrors.filter(e => e.severity === 'error').length > 0;
            const hasWarnings = rowErrors.filter(e => e.severity === 'warning').length > 0;

            return (
              <TableRow
                key={rowIndex}
                sx={{
                  bgcolor: hasErrors ? 'error.light' : hasWarnings ? 'warning.light' : 'inherit',
                  '&:hover': {
                    bgcolor: hasErrors
                      ? 'error.light'
                      : hasWarnings
                        ? 'warning.light'
                        : 'action.hover',
                  },
                }}
              >
                <TableCell>{rowIndex + 1}</TableCell>
                {row.map((cell, cellIndex) => {
                  const column = preview.headers[cellIndex];
                  const cellError = getCellError(rowIndex, column);

                  return (
                    <TableCell
                      key={cellIndex}
                      sx={{
                        borderColor: cellError
                          ? cellError.severity === 'error'
                            ? 'error.main'
                            : 'warning.main'
                          : undefined,
                        borderWidth: cellError ? 2 : undefined,
                        borderStyle: cellError ? 'solid' : undefined,
                      }}
                    >
                      {cellError ? (
                        <Tooltip title={cellError.message}>
                          <span style={{ cursor: 'help' }}>{cell || '-'}</span>
                        </Tooltip>
                      ) : (
                        cell || '-'
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  {hasErrors ? (
                    <Chip icon={<ErrorIcon />} label='Error' color='error' size='small' />
                  ) : hasWarnings ? (
                    <Chip icon={<WarningIcon />} label='Warning' color='warning' size='small' />
                  ) : (
                    <Chip label='Valid' color='success' size='small' />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

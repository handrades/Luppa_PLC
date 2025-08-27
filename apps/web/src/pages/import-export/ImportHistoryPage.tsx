import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import RollbackIcon from '@mui/icons-material/Undo';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useImportExportStore } from '../../stores/importExportStore';
import { ImportLog } from '../../types/import-export';
import { format } from 'date-fns';

export const ImportHistoryPage: React.FC = () => {
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const {
    importHistory,
    historyTotal,
    historyPage,
    historyPageSize,
    isLoadingHistory,
    loadImportHistory,
    rollbackImport,
    getImportDetails,
  } = useImportExportStore();

  useEffect(() => {
    loadImportHistory();
  }, [loadImportHistory]);

  const handleRefresh = () => {
    loadImportHistory();
  };

  const handleRollback = async () => {
    if (selectedImport) {
      try {
        await rollbackImport(selectedImport.id);
        setRollbackDialogOpen(false);
        setSelectedImport(null);
      } catch {
        // Rollback failed - error already handled by store
      }
    }
  };

  const handleViewDetails = async (importLog: ImportLog) => {
    const details = await getImportDetails(importLog.id);
    if (details) {
      setSelectedImport(details);
      setDetailsDialogOpen(true);
    }
  };

  const getStatusChip = (status: ImportLog['status']) => {
    const statusConfig = {
      pending: { color: 'default' as const, label: 'Pending' },
      processing: { color: 'info' as const, label: 'Processing' },
      completed: { color: 'success' as const, label: 'Completed' },
      failed: { color: 'error' as const, label: 'Failed' },
      rolled_back: { color: 'warning' as const, label: 'Rolled Back' },
    };

    const config = statusConfig[status];
    return <Chip label={config.label} color={config.color} size='small' />;
  };

  const columns: GridColDef[] = [
    {
      field: 'filename',
      headerName: 'File Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: params => getStatusChip(params.value),
    },
    {
      field: 'totalRows',
      headerName: 'Total Rows',
      width: 100,
      type: 'number',
    },
    {
      field: 'processedRows',
      headerName: 'Processed',
      width: 100,
      type: 'number',
      renderCell: params => {
        const { processedRows, totalRows } = params.row;
        if (totalRows === 0) return '0';
        const percentage = ((processedRows / totalRows) * 100).toFixed(0);
        return `${processedRows} (${percentage}%)`;
      },
    },
    {
      field: 'skippedRows',
      headerName: 'Skipped',
      width: 100,
      type: 'number',
    },
    {
      field: 'errors',
      headerName: 'Errors',
      width: 80,
      type: 'number',
      renderCell: params => {
        const errorCount = params.value?.length || 0;
        return errorCount > 0 ? <Chip label={errorCount} color='error' size='small' /> : '0';
      },
    },
    {
      field: 'startedAt',
      headerName: 'Started At',
      width: 180,
      valueFormatter: (params: { value?: unknown }) => {
        if (!params.value) return '-';
        return format(new Date(params.value as string), 'yyyy-MM-dd HH:mm:ss');
      },
    },
    {
      field: 'duration',
      headerName: 'Duration',
      width: 100,
      valueFormatter: (params: { value?: unknown }) => {
        if (!params.value) return '-';
        const seconds = (params.value as number) / 1000;
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: params => (
        <Box>
          <Tooltip title='View Details'>
            <IconButton size='small' onClick={() => handleViewDetails(params.row)}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
          {params.row.rollbackAvailable && params.row.status === 'completed' && (
            <Tooltip title='Rollback Import'>
              <IconButton
                size='small'
                onClick={() => {
                  setSelectedImport(params.row);
                  setRollbackDialogOpen(true);
                }}
              >
                <RollbackIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant='h4'>Import History</Typography>
        <Box>
          <Button startIcon={<RefreshIcon />} onClick={handleRefresh} sx={{ mr: 2 }}>
            Refresh
          </Button>
          <Button
            variant='contained'
            startIcon={<DownloadIcon />}
            href='/api/v1/import/template'
            download
          >
            Download Template
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', height: 600 }}>
        <DataGrid
          rows={importHistory}
          columns={columns}
          loading={isLoadingHistory}
          rowCount={historyTotal}
          paginationMode='server'
          paginationModel={{
            page: historyPage - 1,
            pageSize: historyPageSize,
          }}
          onPaginationModelChange={model => {
            if (model.page !== historyPage - 1) {
              loadImportHistory(model.page + 1);
            } else if (model.pageSize !== historyPageSize) {
              loadImportHistory(1, model.pageSize);
            }
          }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
            },
          }}
        />
      </Paper>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onClose={() => setRollbackDialogOpen(false)}>
        <DialogTitle>Confirm Rollback</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to rollback this import? This action will remove all PLCs that
            were imported in this batch.
          </DialogContentText>
          {selectedImport && (
            <Alert severity='warning' sx={{ mt: 2 }}>
              This will affect {selectedImport.processedRows} records.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRollback} color='error' variant='contained'>
            Rollback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Import Details</DialogTitle>
        <DialogContent>
          {selectedImport && (
            <Box>
              <Typography variant='subtitle2' gutterBottom>
                File: {selectedImport.filename}
              </Typography>
              <Typography variant='body2' paragraph>
                Status: {getStatusChip(selectedImport.status)}
              </Typography>
              <Typography variant='body2' paragraph>
                Total Rows: {selectedImport.totalRows} | Processed: {selectedImport.processedRows} |
                Skipped: {selectedImport.skippedRows}
              </Typography>

              {selectedImport.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    Errors:
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 200,
                      overflow: 'auto',
                      bgcolor: 'background.default',
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {selectedImport.errors.map((error, index) => (
                      <Typography key={index} variant='body2' color='error.main'>
                        Row {error.row}, {error.column}: {error.message}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

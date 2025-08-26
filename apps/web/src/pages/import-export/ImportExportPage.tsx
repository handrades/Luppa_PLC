/**
 * Import/Export Page
 *
 * Main page for bulk data operations combining file upload, import preview,
 * options configuration, and export functionality.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  FileUpload as FileUploadIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { FileUpload } from '../../components/import/FileUpload';
import { ImportPreview } from '../../components/import/ImportPreview';
import ImportOptionsComponent from '../../components/import/ImportOptions';
import { ExportConfig } from '../../components/export/ExportConfig';
import {
  useExportState,
  useImportExportStore,
  useImportState,
} from '../../stores/importExport.store';
import { ImportExportService } from '../../services/importExport.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`import-export-tabpanel-${index}`}
      aria-labelledby={`import-export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');

  const {
    selectedFile,
    importStatus,
    uploadProgress,
    validationResult,
    importResult,
    importOptions,
    error: importError,
  } = useImportState();

  const {
    exportFilters,
    exportOptions,
    exportProgress,
    exportStatus,
    error: exportError,
  } = useExportState();

  const {
    setImportStatus,
    setImportResult,
    setError,
    resetImportState,
    setExportProgress,
    setExportStatus,
  } = useImportExportStore();

  // Handle file selection
  const handleFileSelected = (_file: File) => {
    setShowImportPreview(false);
  };

  // Handle validation complete
  const handleValidationComplete = () => {
    setShowImportPreview(true);
  };

  // Handle import execution
  const handleImport = async () => {
    if (!selectedFile) {
      showSnackbar('No file selected', 'error');
      return;
    }

    try {
      setImportStatus('importing');
      const result = await ImportExportService.importPLCs(
        selectedFile,
        importOptions,
        _progress => {
          // Progress is already handled by the service via uploadProgress
        }
      );

      setImportResult(result);
      setImportStatus('completed');

      if (result.success) {
        showSnackbar(
          `Import completed! ${result.successfulRows} rows imported successfully.`,
          'success'
        );
      } else {
        showSnackbar(`Import completed with errors. ${result.failedRows} rows failed.`, 'warning');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
      setImportStatus('error');
      showSnackbar(errorMessage, 'error');
    }
  };

  // Handle export execution
  const handleExport = async () => {
    try {
      setExportStatus('exporting');
      setExportProgress(0);

      await ImportExportService.exportPLCs(exportFilters, exportOptions, progress => {
        setExportProgress(progress);
      });

      setExportStatus('completed');
      setExportProgress(100);
      showSnackbar('Export completed successfully!', 'success');

      // Reset export state after a delay
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('idle');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      setExportStatus('error');
      showSnackbar(errorMessage, 'error');
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Reset import state
  const handleResetImport = () => {
    resetImportState();
    setShowImportPreview(false);
  };

  // Show snackbar notification
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Calculate import readiness
  const canImport =
    selectedFile &&
    validationResult &&
    importStatus !== 'importing' &&
    importStatus !== 'uploading';

  const hasValidationErrors =
    validationResult &&
    (validationResult.headerErrors.length > 0 ||
      validationResult.rowErrors.some(re => re.errors.some(e => e.severity === 'error')));

  // Calculate export readiness
  const canExport = exportStatus !== 'exporting' && exportStatus !== 'preparing';

  return (
    <Container maxWidth='lg' sx={{ py: 3 }}>
      <Typography variant='h4' component='h1' sx={{ mb: 3 }}>
        Import & Export
      </Typography>

      {/* Progress Indicators */}
      {importStatus === 'importing' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant='body2' sx={{ mb: 1 }}>
            Importing data... {Math.round(uploadProgress)}%
          </Typography>
          <LinearProgress variant='determinate' value={uploadProgress} />
        </Box>
      )}

      {exportStatus === 'exporting' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant='body2' sx={{ mb: 1 }}>
            Preparing export... {Math.round(exportProgress)}%
          </Typography>
          <LinearProgress variant='determinate' value={exportProgress} />
        </Box>
      )}

      {/* Main Content */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label='import export tabs'
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            icon={<FileUploadIcon />}
            iconPosition='start'
            label='Import'
            id='import-export-tab-0'
            aria-controls='import-export-tabpanel-0'
          />
          <Tab
            icon={<DownloadIcon />}
            iconPosition='start'
            label='Export'
            id='import-export-tab-1'
            aria-controls='import-export-tabpanel-1'
          />
          <Tab
            icon={<HistoryIcon />}
            iconPosition='start'
            label='History'
            id='import-export-tab-2'
            aria-controls='import-export-tabpanel-2'
          />
        </Tabs>

        {/* Import Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack spacing={4}>
              {/* File Upload */}
              <Box>
                <Typography variant='h5' sx={{ mb: 2 }}>
                  Step 1: Select CSV File
                </Typography>
                <FileUpload
                  onFileSelected={handleFileSelected}
                  onValidationComplete={handleValidationComplete}
                  disabled={importStatus === 'importing'}
                />
              </Box>

              {/* Import Preview */}
              {showImportPreview && validationResult && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant='h5' sx={{ mb: 2 }}>
                      Step 2: Review Data
                    </Typography>
                    <ImportPreview />
                  </Box>
                </>
              )}

              {/* Import Options */}
              {showImportPreview && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant='h5' sx={{ mb: 2 }}>
                      Step 3: Configure Import
                    </Typography>
                    <ImportOptionsComponent disabled={importStatus === 'importing'} />
                  </Box>
                </>
              )}

              {/* Import Actions */}
              {showImportPreview && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant='h5' sx={{ mb: 2 }}>
                      Step 4: Execute Import
                    </Typography>

                    {hasValidationErrors && !importOptions.validateOnly && (
                      <Alert severity='warning' sx={{ mb: 2 }}>
                        There are validation errors in your data. Consider fixing them first or
                        switching to "Validate Only" mode.
                      </Alert>
                    )}

                    <Stack direction='row' spacing={2}>
                      <Button
                        variant='contained'
                        onClick={handleImport}
                        disabled={!canImport}
                        size='large'
                      >
                        {importOptions.validateOnly ? 'Validate Data' : 'Import Data'}
                      </Button>
                      <Button
                        variant='outlined'
                        onClick={handleResetImport}
                        disabled={importStatus === 'importing'}
                      >
                        Start Over
                      </Button>
                    </Stack>
                  </Box>
                </>
              )}

              {/* Import Result */}
              {importResult && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant='h5' sx={{ mb: 2 }}>
                      Import Results
                    </Typography>
                    <Alert severity={importResult.success ? 'success' : 'error'}>
                      <Typography variant='body1' sx={{ mb: 1 }}>
                        <strong>
                          {importResult.success ? 'Import Completed' : 'Import Failed'}
                        </strong>
                      </Typography>
                      <Typography variant='body2'>
                        Total rows: {importResult.totalRows} | Successful:{' '}
                        {importResult.successfulRows} | Failed: {importResult.failedRows}
                      </Typography>
                      {importResult.createdEntities && (
                        <Typography variant='body2' sx={{ mt: 1 }}>
                          Created: {importResult.createdEntities.sites} sites,{' '}
                          {importResult.createdEntities.cells} cells,{' '}
                          {importResult.createdEntities.equipment} equipment,{' '}
                          {importResult.createdEntities.plcs} PLCs
                        </Typography>
                      )}
                    </Alert>
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        </TabPanel>

        {/* Export Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, pb: 3 }}>
            <ExportConfig
              onExport={handleExport}
              disabled={!canExport}
              estimatedRecords={1250} // Mock data - would come from API
            />
          </Box>
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, pb: 3 }}>
            <Typography variant='h5' sx={{ mb: 2 }}>
              Import History
            </Typography>
            <Alert severity='info'>
              Import history functionality will be implemented in the next phase.
            </Alert>
          </Box>
        </TabPanel>
      </Paper>

      {/* Error Display */}
      {(importError || exportError) && (
        <Alert severity='error' onClose={() => setError(null)} sx={{ mb: 2 }}>
          {importError || exportError}
        </Alert>
      )}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ImportExportPage;

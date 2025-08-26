/**
 * File Upload Component
 *
 * Drag-and-drop CSV upload component with Material-UI support,
 * file validation, progress indicator, and upload status display.
 */

import React, { useCallback, useState } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useImportExportStore, useImportState } from '../../stores/importExport.store';
import { ImportExportService } from '../../services/importExport.service';

interface FileUploadProps {
  onFileSelected?: (file: File) => void;
  onValidationComplete?: () => void;
  disabled?: boolean;
  maxSizeBytes?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  onValidationComplete,
  disabled = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
}) => {
  const { selectedFile, uploadProgress, importStatus, validationResult, error } = useImportState();

  const {
    setSelectedFile,
    setUploadProgress,
    setImportStatus,
    setValidationResult,
    setError,
    clearError,
  } = useImportExportStore();

  const [dragError, setDragError] = useState<string | null>(null);

  // File validation
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        return 'Only CSV files are allowed';
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        return `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`;
      }

      // Check if file is empty
      if (file.size === 0) {
        return 'File cannot be empty';
      }

      return null;
    },
    [maxSizeBytes]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      clearError();
      setDragError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setDragError(validationError);
        return;
      }

      setSelectedFile(file);
      onFileSelected?.(file);

      // Start validation
      setImportStatus('validating');
      setUploadProgress(0);

      try {
        const result = await ImportExportService.validateFile(file, progress => {
          setUploadProgress(progress);
        });

        setValidationResult(result);
        setImportStatus('completed');
        onValidationComplete?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'File validation failed';
        setError(errorMessage);
        setImportStatus('error');
      }
    },
    [
      validateFile,
      setSelectedFile,
      setImportStatus,
      setUploadProgress,
      setValidationResult,
      setError,
      clearError,
      onFileSelected,
      onValidationComplete,
    ]
  );

  // Dropzone configuration
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        const firstRejection = rejectedFiles[0];
        const error = firstRejection.errors[0];
        setDragError(error.message);
        return;
      }

      if (acceptedFiles.length > 0) {
        handleFileSelect(acceptedFiles[0]);
      }
    },
    [handleFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'text/plain': ['.csv'],
    },
    multiple: false,
    maxSize: maxSizeBytes,
    disabled: disabled || importStatus === 'validating',
  });

  // Handle file removal
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setValidationResult(null);
    setUploadProgress(0);
    setImportStatus('idle');
    clearError();
    setDragError(null);
  }, [setSelectedFile, setValidationResult, setUploadProgress, setImportStatus, clearError]);

  // Handle template download
  const handleDownloadTemplate = useCallback(async () => {
    try {
      await ImportExportService.downloadTemplate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      setError(errorMessage);
    }
  }, [setError]);

  // Render file info
  const renderFileInfo = () => {
    if (!selectedFile) return null;

    const formatFileSize = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
      <Paper variant='outlined' sx={{ p: 2, mt: 2 }}>
        <Stack direction='row' alignItems='center' spacing={2}>
          <DescriptionIcon color='primary' />
          <Box sx={{ flex: 1 }}>
            <Typography variant='body1' fontWeight='medium'>
              {selectedFile.name}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {formatFileSize(selectedFile.size)}
            </Typography>
          </Box>
          <IconButton onClick={handleRemoveFile} size='small'>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Paper>
    );
  };

  // Render validation status
  const renderValidationStatus = () => {
    if (importStatus === 'validating') {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            Validating file...
          </Typography>
          <LinearProgress variant='determinate' value={uploadProgress} />
        </Box>
      );
    }

    if (validationResult) {
      const { isValid, headerErrors, rowErrors } = validationResult;
      const totalErrors = headerErrors.length + rowErrors.length;

      return (
        <Box sx={{ mt: 2 }}>
          {isValid && totalErrors === 0 ? (
            <Alert severity='success'>File validation successful! Ready to import.</Alert>
          ) : (
            <Alert severity='warning'>
              Found {totalErrors} validation issue(s). Review before importing.
            </Alert>
          )}

          {headerErrors.length > 0 && (
            <Alert severity='error' sx={{ mt: 1 }}>
              Header errors: {headerErrors.join(', ')}
            </Alert>
          )}
        </Box>
      );
    }

    return null;
  };

  const currentError = error || dragError;

  return (
    <Box>
      {/* Template Download Button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownloadTemplate}
          variant='outlined'
          size='small'
        >
          Download Template
        </Button>
      </Box>

      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        variant='outlined'
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: disabled || importStatus === 'validating' ? 'default' : 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragReject
            ? 'error.lighter'
            : isDragActive
              ? 'primary.lighter'
              : 'transparent',
          transition: 'border-color 0.2s, background-color 0.2s',
          '&:hover': {
            borderColor: disabled || importStatus === 'validating' ? 'grey.300' : 'primary.main',
            backgroundColor:
              disabled || importStatus === 'validating' ? 'transparent' : 'primary.lighter',
          },
        }}
      >
        <input {...getInputProps()} />

        <CloudUploadIcon
          sx={{
            fontSize: 48,
            color: isDragReject ? 'error.main' : 'grey.400',
            mb: 2,
          }}
        />

        {selectedFile ? (
          <Typography variant='h6' color='text.primary'>
            File Selected
          </Typography>
        ) : isDragActive ? (
          <Typography variant='h6' color='primary'>
            Drop the CSV file here...
          </Typography>
        ) : (
          <Box>
            <Typography variant='h6' color='text.primary' sx={{ mb: 1 }}>
              Drag & drop a CSV file here, or click to select
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Maximum file size: {Math.round(maxSizeBytes / 1024 / 1024)}MB
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label='CSV only' size='small' variant='outlined' />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Error Display */}
      {currentError && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {currentError}
        </Alert>
      )}

      {/* Selected File Info */}
      {renderFileInfo()}

      {/* Validation Status */}
      {renderValidationStatus()}
    </Box>
  );
};

export default FileUpload;

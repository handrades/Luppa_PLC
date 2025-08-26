import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Typography,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useImportExportStore } from '../../stores/importExportStore';
import { PreviewTable } from './PreviewTable';
import { ImportProgress } from './ImportProgress';
import { ValidationErrors } from './ValidationErrors';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const steps = ['Upload File', 'Preview & Validate', 'Configure Options', 'Import'];

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImportComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'skip' | 'update' | 'replace'>('skip');
  const [createMissing, setCreateMissing] = useState(true);
  const [validateOnly, setValidateOnly] = useState(false);

  const {
    preview,
    validationErrors,
    importProgress,
    isImporting,
    uploadFile,
    validateFile,
    startImport,
    clearImport,
  } = useImportExportStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFile(file);

        // Upload and validate file
        await uploadFile(file);
        const isValid = await validateFile(file);

        if (isValid) {
          setActiveStep(1); // Move to preview step
        }
      }
    },
    [uploadFile, validateFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleImport = async () => {
    if (!file) return;

    const options = {
      createMissing,
      mergeStrategy,
      validateOnly,
    };

    const result = await startImport(file, options);

    if (result.success) {
      onImportComplete?.();
      handleClose();
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    clearImport();
    onClose();
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' gutterBottom>
              {isDragActive
                ? 'Drop the CSV file here'
                : 'Drag and drop a CSV file here, or click to select'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Maximum file size: 10MB
            </Typography>
            {file && (
              <Alert severity='info' sx={{ mt: 2 }}>
                Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            {preview && (
              <>
                <Alert severity='info' sx={{ mb: 2 }}>
                  Showing first {preview.previewRows} of {preview.totalRows} rows
                </Alert>

                {validationErrors.length > 0 && <ValidationErrors errors={validationErrors} />}

                <PreviewTable preview={preview} errors={validationErrors} />
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <FormControl component='fieldset' sx={{ mb: 3 }}>
              <FormLabel component='legend'>Merge Strategy</FormLabel>
              <RadioGroup
                value={mergeStrategy}
                onChange={e => setMergeStrategy(e.target.value as 'skip' | 'update' | 'replace')}
              >
                <FormControlLabel
                  value='skip'
                  control={<Radio />}
                  label='Skip duplicates (based on IP address)'
                />
                <FormControlLabel
                  value='update'
                  control={<Radio />}
                  label='Update existing records'
                />
                <FormControlLabel
                  value='replace'
                  control={<Radio />}
                  label='Replace existing records'
                />
              </RadioGroup>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={createMissing}
                  onChange={e => setCreateMissing(e.target.checked)}
                />
              }
              label='Auto-create missing hierarchy (Sites, Cells, Equipment)'
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch checked={validateOnly} onChange={e => setValidateOnly(e.target.checked)} />
              }
              label="Validate only (don't import)"
            />
          </Box>
        );

      case 3:
        return (
          <Box>
            {isImporting ? (
              <ImportProgress progress={importProgress} />
            ) : importProgress?.success === false ? (
              <Alert severity='error'>Import failed. Please check the errors and try again.</Alert>
            ) : importProgress?.success === true ? (
              <Alert severity='success' icon={<CheckCircleIcon />}>
                Import completed successfully! {importProgress.processedRows} rows processed.
              </Alert>
            ) : (
              <Alert severity='info'>Ready to import. Click "Import" to begin.</Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' },
      }}
    >
      <DialogTitle>Import PLCs from CSV</DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button disabled={activeStep === 0 || isImporting} onClick={handleBack}>
          Back
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button variant='contained' onClick={handleImport} disabled={isImporting || !file}>
            {validateOnly ? 'Validate' : 'Import'}
          </Button>
        ) : (
          <Button
            variant='contained'
            onClick={handleNext}
            disabled={
              (activeStep === 0 && !file) ||
              (activeStep === 1 && validationErrors.filter(e => e.severity === 'error').length > 0)
            }
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Switch,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useImportExportStore } from '../../stores/importExportStore';
import { useFilterStore } from '../../stores/filter.store';
import { FilterChips } from '../filters/FilterChips';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeHierarchy, setIncludeHierarchy] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [includeAuditInfo, setIncludeAuditInfo] = useState(false);

  const { isExporting, exportError, exportData } = useImportExportStore();
  const { filters } = useFilterStore();

  const handleExport = async () => {
    const options = {
      format,
      includeHierarchy,
      includeTags,
      includeAuditInfo,
    };

    // Convert AdvancedFilters to ExportFilters format
    const exportFilters = {
      siteIds: filters.siteIds,
      cellIds: undefined, // Not available in AdvancedFilters
      equipmentIds: undefined, // Not available in AdvancedFilters
      cellTypes: filters.cellTypes,
      equipmentTypes: filters.equipmentTypes,
      dateRange:
        filters.createdAfter && filters.createdBefore
          ? {
              start: filters.createdAfter,
              end: filters.createdBefore,
            }
          : undefined,
      ipRange:
        filters.ipRange?.cidr ||
        (filters.ipRange?.startIP && filters.ipRange?.endIP
          ? `${filters.ipRange.startIP}-${filters.ipRange.endIP}`
          : undefined),
      tags: filters.tagFilter?.include,
    };

    const result = await exportData(exportFilters, options);

    if (result) {
      // Trigger download
      const blob = new Blob([result], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plc_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    }
  };

  const hasActiveFilters =
    filters &&
    Object.values(filters).some(
      filter => filter && (Array.isArray(filter) ? filter.length > 0 : true)
    );

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Export PLCs</DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant='subtitle2' gutterBottom>
            Active Filters
          </Typography>
          {hasActiveFilters ? (
            <FilterChips filters={filters} onRemoveFilter={() => {}} onClearAll={() => {}} />
          ) : (
            <Alert severity='info'>No filters applied - all PLCs will be exported</Alert>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <FormControl component='fieldset' sx={{ mb: 3 }}>
          <FormLabel component='legend'>Export Format</FormLabel>
          <RadioGroup value={format} onChange={e => setFormat(e.target.value as 'csv' | 'json')}>
            <FormControlLabel
              value='csv'
              control={<Radio />}
              label='CSV (Comma-separated values)'
            />
            <FormControlLabel
              value='json'
              control={<Radio />}
              label='JSON (JavaScript Object Notation)'
            />
          </RadioGroup>
        </FormControl>

        <Typography variant='subtitle2' gutterBottom>
          Include Options
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={includeHierarchy}
              onChange={e => setIncludeHierarchy(e.target.checked)}
            />
          }
          label='Include hierarchy information (Site, Cell, Equipment)'
          sx={{ mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch checked={includeTags} onChange={e => setIncludeTags(e.target.checked)} />
          }
          label='Include tags'
          sx={{ mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={includeAuditInfo}
              onChange={e => setIncludeAuditInfo(e.target.checked)}
            />
          }
          label='Include audit information (created/updated dates and users)'
          sx={{ mb: 2 }}
        />

        {exportError && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {exportError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleExport}
          disabled={isExporting}
          startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * EquipmentListPage Component
 * Story 4.3: Equipment List UI
 *
 * Main equipment list page with search, sorting, selection, and DataGrid integration
 * Implements all acceptance criteria for the equipment list functionality
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Clear as ClearIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Column, DataGrid } from '../../components/common/DataDisplay/DataGrid';
import { EquipmentEmptyState } from '../../components/equipment/EquipmentEmptyState';
import { EquipmentActions } from '../../components/equipment/EquipmentActions';
import { useEquipmentSearch } from '../../hooks/useEquipmentSearch';
import { useEquipment } from '../../hooks/useEquipment';
import { useToast } from '../../hooks/useToast';
import {
  useClearError,
  useClearSelection,
  useDeleteEquipment,
  useEquipmentData,
  useEquipmentError,
  useEquipmentLoading,
  useEquipmentSelection,
  useFetchEquipment,
  useHasActiveFilters,
  useHasEquipmentData,
  useSetFilters,
  useSetSelection,
} from '../../stores/equipment.store';
import type { EquipmentListPageProps, EquipmentWithDetails } from '../../types/equipment';

/**
 * Equipment List Page Component
 *
 * @param props - Component props
 * @returns Equipment list page component
 */
export const EquipmentListPage: React.FC<EquipmentListPageProps> = ({ initialFilters }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Local state for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Store selectors - using individual selectors to prevent infinite loops
  const equipment = useEquipmentData();
  const isLoading = useEquipmentLoading();
  const error = useEquipmentError();
  const selection = useEquipmentSelection();
  const hasData = useHasEquipmentData();
  const hasActiveFilters = useHasActiveFilters();

  // Store actions - using individual action selectors to prevent object recreation
  const fetchEquipment = useFetchEquipment();
  const setSelection = useSetSelection();
  const clearSelection = useClearSelection();
  const clearError = useClearError();
  const setFilters = useSetFilters();
  const deleteEquipment = useDeleteEquipment();

  // Search functionality
  const { searchTerm, setSearchTerm, isSearching, clearSearch } = useEquipmentSearch();

  // Equipment data hook for React Query integration
  const { refetch } = useEquipment(initialFilters);

  // Initialize data on mount
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    } else {
      fetchEquipment();
    }
    // ESLint disable is intentional - actions from Zustand are stable
  }, [initialFilters]);

  // Column definitions for DataGrid - memoized to prevent recreation
  const columns = useMemo(
    (): Column<EquipmentWithDetails>[] => [
      {
        id: 'description',
        label: 'Description',
        sortable: true,
        filterable: true,
        width: 300,
        format: (value, row) =>
          (value as string) || `${(row as EquipmentWithDetails).name} (No PLC)`,
      },
      {
        id: 'make',
        label: 'Make',
        sortable: true,
        filterable: true,
        width: 150,
        format: value => (value as string) || '-',
      },
      {
        id: 'model',
        label: 'Model',
        sortable: true,
        filterable: true,
        width: 150,
        format: value => (value as string) || '-',
      },
      {
        id: 'ip',
        label: 'IP Address',
        sortable: true,
        filterable: true,
        width: 140,
        format: value => (value as string) || '-',
      },
      {
        id: 'siteName',
        label: 'Site',
        sortable: true,
        filterable: true,
        width: 120,
      },
      {
        id: 'cellType',
        label: 'Cell Type',
        sortable: true,
        filterable: true,
        width: 120,
      },
    ],
    []
  );

  // Row click handler - navigate to equipment detail
  const handleRowClick = useCallback(
    (equipment: EquipmentWithDetails) => {
      navigate(`/equipment/${equipment.id}`);
    },
    [navigate]
  );

  // Selection handlers
  const handleSelectionChange = useCallback(
    (selectedRows: Set<string | number>) => {
      const selectedIds = new Set(Array.from(selectedRows).map(String));
      setSelection(selectedIds);
    },
    [setSelection]
  );

  // Clear filters handler
  const handleClearFilters = useCallback(() => {
    clearSearch();
    setFilters({
      page: 1,
      limit: 50,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }, [clearSearch, setFilters]);

  // Add equipment handler (placeholder for future functionality)
  const handleAddEquipment = useCallback(() => {
    navigate('/equipment/new');
  }, [navigate]);

  // Export handler (placeholder for future functionality)
  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    // Future implementation will call equipmentService.exportEquipment
    if (selection.selectedIds.size === 0) return;

    // Placeholder for export logic
    // Future implementation will call equipmentService.exportEquipment with selected IDs
    // Export service call would go here
  }, [selection.selectedIds]);

  // Delete handler with confirmation dialog
  const handleDelete = useCallback(() => {
    if (selection.selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  }, [selection.selectedIds]);

  // Confirm delete handler
  const handleConfirmDelete = useCallback(async () => {
    const selectedIds = Array.from(selection.selectedIds);

    if (selectedIds.length === 0) {
      setDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);

    try {
      await deleteEquipment(selectedIds);

      const itemText = selectedIds.length === 1 ? 'item' : 'items';
      showSuccess(`Successfully deleted ${selectedIds.length} ${itemText}`);

      setDeleteDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete equipment';
      showError(`Delete failed: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  }, [selection.selectedIds, deleteEquipment, showSuccess, showError]);

  // Cancel delete handler
  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  // Error handling
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='error'
          action={
            <button
              onClick={() => {
                clearError();
                refetch();
              }}
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      {/* Page Header */}
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
        <Typography variant='h4' component='h1'>
          Equipment
        </Typography>
      </Stack>

      {/* Search Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder='Search equipment by description, make, model, IP address, site, or cell...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          aria-label='Search equipment'
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon color='action' />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position='end'>
                <button
                  onClick={handleClearSearch}
                  aria-label='Clear search'
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ClearIcon color='action' fontSize='small' />
                </button>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
            },
          }}
        />

        {/* Search Loading Indicator */}
        {isSearching && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant='body2' color='text.secondary'>
              Searching...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bulk Actions Toolbar */}
      <EquipmentActions
        selectedCount={selection.selectedCount}
        onExport={handleExport}
        onDelete={handleDelete}
        onClearSelection={clearSelection}
      />

      {/* Main Content */}
      {isLoading && !hasData ? (
        // Initial loading state with skeleton
        <Box>
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton
              key={index}
              variant='rectangular'
              height={52}
              sx={{ mb: 1, borderRadius: 1 }}
            />
          ))}
        </Box>
      ) : !hasData && !isLoading ? (
        // Empty state
        <EquipmentEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          onAddEquipment={handleAddEquipment}
        />
      ) : (
        // Data grid with equipment
        <DataGrid
          data={equipment}
          columns={columns}
          rowHeight={52}
          height={600}
          overscanRowCount={10}
          onRowClick={handleRowClick}
          rowKey={row => row.id}
          loading={isLoading}
          emptyMessage='No equipment found matching your criteria'
          sortable={true}
          multiSort={false}
          selectable={true}
          selectionMode='multiple'
          selectedRows={selection.selectedIds}
          onSelectionChange={handleSelectionChange}
          resizable={true}
          reorderable={false}
          persistLayoutKey='equipmentList'
        />
      )}

      {/* Loading overlay for search/filter operations */}
      {(isLoading || isSearching) && hasData && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Stack alignItems='center' spacing={2}>
            <CircularProgress />
            <Typography variant='body2' color='text.secondary'>
              {isSearching ? 'Searching equipment...' : 'Loading equipment...'}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby='delete-dialog-title'
        aria-describedby='delete-dialog-description'
      >
        <DialogTitle id='delete-dialog-title'>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText id='delete-dialog-description'>
            Are you sure you want to delete {selection.selectedIds.size} equipment{' '}
            {selection.selectedIds.size === 1 ? 'item' : 'items'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color='primary' disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color='error'
            variant='contained'
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : undefined}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EquipmentListPage;

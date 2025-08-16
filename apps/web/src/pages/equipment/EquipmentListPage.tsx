/**
 * EquipmentListPage Component
 * Story 4.3: Equipment List UI
 *
 * Main equipment list page with search, sorting, selection, and DataGrid integration
 * Implements all acceptance criteria for the equipment list functionality
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
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
import {
  useEquipmentActions,
  useEquipmentData,
  useEquipmentError,
  useEquipmentLoading,
  useEquipmentSelection,
  useHasActiveFilters,
  useHasEquipmentData,
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

  // Store selectors
  const equipment = useEquipmentData();
  const isLoading = useEquipmentLoading();
  const error = useEquipmentError();
  const selection = useEquipmentSelection();
  const hasData = useHasEquipmentData();
  const hasActiveFilters = useHasActiveFilters();

  // Store actions
  const { fetchEquipment, setSelection, clearSelection, clearError, setFilters } =
    useEquipmentActions();

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
  }, [initialFilters, setFilters, fetchEquipment]);

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

  // Delete handler (placeholder for future functionality)
  const handleDelete = useCallback(() => {
    // TODO: Implement delete functionality
    // Future implementation will show confirmation dialog and call delete API
    if (selection.selectedIds.size === 0) return;

    // Placeholder for delete logic
    // Future implementation will show confirmation dialog and call delete API with selected IDs
    // Delete service call with confirmation would go here
  }, [selection.selectedIds]);

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
    <Box sx={{ p: 3 }}>
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
    </Box>
  );
};

export default EquipmentListPage;

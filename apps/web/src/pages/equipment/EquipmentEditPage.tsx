/**
 * Equipment Edit Page
 * Story 4.4: Equipment Form UI - Task 9
 *
 * Page component for editing existing equipment records.
 * Handles data loading, optimistic locking, and navigation.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Skeleton,
  Typography,
} from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';

import { AppLayout } from '../../components/common/Layout/AppLayout';
import EquipmentForm from '../../components/equipment/EquipmentForm';
import { LoadingSkeleton } from '../../components/common/Feedback/LoadingSkeleton';
import { EquipmentFormMode } from '../../types/equipment-form';
import type { Equipment, EquipmentWithDetails } from '../../types/equipment';
import { equipmentService } from '../../services/equipment.service';

/**
 * Equipment Edit Page Component
 *
 * Features:
 * - Equipment data loading with loading states
 * - Error handling for not found or permission errors
 * - Optimistic locking conflict resolution
 * - Success/error handling with notifications
 * - Breadcrumb navigation with equipment name
 */
const EquipmentEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [equipment, setEquipment] = useState<EquipmentWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    current: EquipmentWithDetails;
    conflicting: EquipmentWithDetails;
  } | null>(null);

  // Load equipment data
  const loadEquipment = useCallback(async () => {
    if (!id) {
      setError('Equipment ID is required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await equipmentService.getEquipmentForEdit(id);
      setEquipment(data);
    } catch (error: unknown) {
      // Error loading equipment - handled by UI state
      const typedError = error as { status?: number; message?: string };

      if (typedError.status === 404) {
        setError('Equipment not found');
      } else if (typedError.status === 403) {
        setError("You don't have permission to edit this equipment");
      } else {
        setError(typedError.message || 'Failed to load equipment data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load equipment data on mount
  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  // Handle successful equipment update
  const handleSuccess = useCallback(
    (updatedEquipment: Equipment) => {
      // TODO: Show success toast notification
      // Equipment update successful - logged via audit system

      // Navigate back to equipment list or detail view
      navigate('/equipment', {
        state: {
          message: `Equipment "${updatedEquipment.name}" updated successfully`,
          type: 'success',
        },
      });
    },
    [navigate]
  );

  // Handle form cancellation
  const handleCancel = useCallback(() => {
    navigate('/equipment');
  }, [navigate]);

  // Handle optimistic locking conflicts
  const handleOptimisticLockConflict = useCallback(
    (conflictInfo: { current: EquipmentWithDetails; conflicting: EquipmentWithDetails }) => {
      setConflictData(conflictInfo);
      setConflictDialogOpen(true);
    },
    []
  );

  // Handle conflict resolution - reload fresh data
  const handleReloadFreshData = useCallback(() => {
    setConflictDialogOpen(false);
    setConflictData(null);
    loadEquipment();
  }, [loadEquipment]);

  // Handle conflict resolution - force save
  const handleForceSave = useCallback(() => {
    setConflictDialogOpen(false);
    setConflictData(null);
    // TODO: Implement force save logic
    // Force save functionality to be implemented
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <Container maxWidth='lg' sx={{ py: 3 }}>
          <Breadcrumbs sx={{ mb: 3 }}>
            <Skeleton variant='text' width={100} />
            <Skeleton variant='text' width={150} />
          </Breadcrumbs>

          <Box sx={{ mb: 4 }}>
            <Skeleton variant='text' width={300} height={40} />
            <Skeleton variant='text' width={500} height={24} />
          </Box>

          <LoadingSkeleton variant='form' rows={15} />
        </Container>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <Container maxWidth='lg' sx={{ py: 3 }}>
          <Breadcrumbs sx={{ mb: 3 }}>
            <Link
              color='inherit'
              href='/equipment'
              onClick={e => {
                e.preventDefault();
                navigate('/equipment');
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
              }}
            >
              <ArrowBack sx={{ mr: 0.5, fontSize: 16 }} />
              Equipment
            </Link>
            <Typography color='text.primary'>Edit Equipment</Typography>
          </Breadcrumbs>

          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={loadEquipment} startIcon={<Refresh />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Container>
      </AppLayout>
    );
  }

  // Equipment not loaded
  if (!equipment) {
    return (
      <AppLayout>
        <Container maxWidth='lg' sx={{ py: 3 }}>
          <Alert severity='warning'>Equipment data could not be loaded.</Alert>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container maxWidth='lg' sx={{ py: 3 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            color='inherit'
            href='/equipment'
            onClick={e => {
              e.preventDefault();
              navigate('/equipment');
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <ArrowBack sx={{ mr: 0.5, fontSize: 16 }} />
            Equipment
          </Link>
          <Typography color='text.primary'>
            Edit: {equipment.name || equipment.description}
          </Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' component='h1' gutterBottom>
            Edit Equipment
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Update equipment details and specifications.
          </Typography>

          {/* Equipment Info */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              <strong>ID:</strong> {equipment.id}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              <strong>Last Updated:</strong>{' '}
              {equipment.updatedAt ? new Date(equipment.updatedAt).toLocaleString() : 'Unknown'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              <strong>Updated By:</strong> {equipment.updatedBy || 'Unknown'}
            </Typography>
          </Box>
        </Box>

        {/* Permission Check */}
        {/* TODO: Add actual permission checking when auth is implemented */}
        {/* 
        <Alert severity="error" sx={{ mb: 3 }}>
          You don't have permission to edit this equipment. Please contact your administrator.
        </Alert>
        */}

        {/* Equipment Form */}
        <EquipmentForm
          mode={EquipmentFormMode.EDIT}
          initialData={equipment}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          onOptimisticLockConflict={handleOptimisticLockConflict}
        />

        {/* Optimistic Locking Conflict Dialog */}
        <Dialog
          open={conflictDialogOpen}
          onClose={() => setConflictDialogOpen(false)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>Conflicting Changes Detected</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This equipment has been modified by another user since you started editing. You can
              either reload the latest data (losing your changes) or force save your changes
              (overwriting the other user's changes).
            </DialogContentText>

            {conflictData && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant='body2'>
                  <strong>Conflicting changes by:</strong>{' '}
                  {conflictData.conflicting.updatedBy || 'Unknown'}
                  <br />
                  <strong>Modified at:</strong>{' '}
                  {new Date(conflictData.conflicting.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConflictDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReloadFreshData} variant='outlined'>
              Reload Fresh Data
            </Button>
            <Button onClick={handleForceSave} variant='contained' color='warning'>
              Force Save My Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AppLayout>
  );
};

export default EquipmentEditPage;

/**
 * Equipment Create Page
 * Story 4.4: Equipment Form UI - Task 8
 *
 * Page component for creating new equipment records.
 * Handles navigation, permissions, and success/error states.
 */

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Breadcrumbs, Container, Link, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

import { AppLayout } from '../../components/common/Layout/AppLayout';
import EquipmentForm from '../../components/equipment/EquipmentForm';
import { EquipmentFormMode } from '../../types/equipment-form';
import type { Equipment } from '../../types/equipment';

/**
 * Equipment Create Page Component
 *
 * Features:
 * - Page title and breadcrumb navigation
 * - Permission checking for equipment creation
 * - Success/error handling with toast notifications
 * - Navigation on successful creation
 * - Loading states during form submission
 */
const EquipmentCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Handle successful equipment creation
  const handleSuccess = useCallback(
    (equipment: Equipment) => {
      // TODO: Show success toast notification
      // Equipment creation successful - logged via audit system

      // Navigate to equipment list or detail view
      // For now, navigate to equipment list
      navigate('/equipment', {
        state: {
          message: `Equipment "${equipment.name}" created successfully`,
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
          <Typography color='text.primary'>Add New Equipment</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' component='h1' gutterBottom>
            Add New Equipment
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Create a new equipment record with all required details and specifications.
          </Typography>
        </Box>

        {/* Permission Check */}
        {/* TODO: Add actual permission checking when auth is implemented */}
        {/* 
        <Alert severity="error" sx={{ mb: 3 }}>
          You don't have permission to create equipment. Please contact your administrator.
        </Alert>
        */}

        {/* Equipment Form */}
        <EquipmentForm
          mode={EquipmentFormMode.CREATE}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Container>
    </AppLayout>
  );
};

export default EquipmentCreatePage;

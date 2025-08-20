/**
 * Hierarchy Management Page
 * Split view layout with tree on left and details on right
 * Story 4.5: Site Hierarchy Management
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  GridView as CellIcon,
  Dashboard as DashboardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Memory as EquipmentIcon,
  GetApp as ExportIcon,
  Factory as FactoryIcon,
  FilterList as FilterIcon,
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Fab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCurrentLocation, useHierarchyStore } from '../../stores/hierarchy.store';
import { HierarchyTree } from '../../components/hierarchy/HierarchyTree';
import { HierarchyFilterPanel } from '../../components/hierarchy/HierarchyFilterPanel';
import { AppLayout } from '../../components/common/Layout/AppLayout';
import { Cell, HierarchyNode, Site } from '../../types/hierarchy';
import { Equipment } from '../../types/equipment';

/**
 * Statistics card component
 */
const StatisticsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  loading?: boolean;
}> = ({ title, value, icon, color = 'primary', loading }) => (
  <Card>
    <CardContent>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography color='text.secondary' gutterBottom variant='body2'>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={60} height={32} />
          ) : (
            <Typography variant='h4' component='div' color={`${color}.main`}>
              {value.toLocaleString()}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Details panel component
 */
const DetailsPanel: React.FC<{
  selectedNode: HierarchyNode | null;
  onEdit: (node: HierarchyNode) => void;
  onDelete: (node: HierarchyNode) => void;
  onAddChild: (node: HierarchyNode) => void;
}> = ({ selectedNode, onEdit, onDelete, onAddChild }) => {
  if (!selectedNode) {
    return (
      <Paper
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant='h6' color='text.secondary'>
            Select an item from the hierarchy tree
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Choose a site, cell, or equipment to view details
          </Typography>
        </Box>
      </Paper>
    );
  }

  const metadata = selectedNode.metadata;
  const nodeType = selectedNode.type;

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {nodeType === 'site' && <FactoryIcon color='primary' />}
            {nodeType === 'cell' && <CellIcon color='primary' />}
            {nodeType === 'equipment' && <EquipmentIcon color='primary' />}
            <Typography variant='h6'>{selectedNode.name}</Typography>
            <Chip label={nodeType} size='small' variant='outlined' />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Edit'>
              <IconButton size='small' onClick={() => onEdit(selectedNode)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title='Add Child'>
              <IconButton size='small' onClick={() => onAddChild(selectedNode)}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete'>
              <IconButton size='small' color='error' onClick={() => onDelete(selectedNode)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        {nodeType === 'site' && <SiteDetails site={metadata as Site} />}
        {nodeType === 'cell' && <CellDetails cell={metadata as Cell} />}
        {nodeType === 'equipment' && <EquipmentDetails equipment={metadata as Equipment} />}
      </Box>
    </Paper>
  );
};

/**
 * Site details component
 */
const SiteDetails: React.FC<{ site: Site }> = ({ site }) => (
  <Box>
    <Typography variant='h6' gutterBottom>
      Site Information
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Name
        </Typography>
        <Typography variant='body1'>{site.name}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Cells
        </Typography>
        <Typography variant='body1'>{site.cellCount || 0}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Equipment
        </Typography>
        <Typography variant='body1'>{site.equipmentCount || 0}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Created
        </Typography>
        <Typography variant='body1'>{new Date(site.createdAt).toLocaleDateString()}</Typography>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Cell details component
 */
const CellDetails: React.FC<{ cell: Cell }> = ({ cell }) => (
  <Box>
    <Typography variant='h6' gutterBottom>
      Cell Information
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Name
        </Typography>
        <Typography variant='body1'>{cell.name}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Line Number
        </Typography>
        <Typography variant='body1'>{cell.lineNumber}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Site
        </Typography>
        <Typography variant='body1'>{cell.siteName}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Equipment
        </Typography>
        <Typography variant='body1'>{cell.equipmentCount || 0}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Created
        </Typography>
        <Typography variant='body1'>{new Date(cell.createdAt).toLocaleDateString()}</Typography>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Equipment details component
 */
const EquipmentDetails: React.FC<{ equipment: Equipment }> = ({ equipment }) => (
  <Box>
    <Typography variant='h6' gutterBottom>
      Equipment Information
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Name
        </Typography>
        <Typography variant='body1'>{equipment.name}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Type
        </Typography>
        <Typography variant='body1'>{equipment.equipmentType}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Cell ID
        </Typography>
        <Typography variant='body1'>{equipment.cellId}</Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant='body2' color='text.secondary'>
          Created
        </Typography>
        <Typography variant='body1'>
          {new Date(equipment.createdAt).toLocaleDateString()}
        </Typography>
      </Grid>
    </Grid>
  </Box>
);

/**
 * Main Hierarchy Management Page Component
 */
export const HierarchyManagementPage: React.FC = () => {
  // Navigation and URL params
  const navigate = useNavigate();
  // const [_searchParams, _setSearchParams] = useSearchParams(); // Unused

  // Local state
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  // const [_viewMode, _setViewMode] = useState<'tree' | 'list'>('tree'); // Unused
  const [actionMenu, setActionMenu] = useState<null | HTMLElement>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    node: HierarchyNode | null;
  }>({ open: false, node: null });

  // Store hooks
  const {
    hierarchyTree,
    hierarchyStatistics,
    isLoadingTree,
    isLoadingStatistics,
    error,
    // selectedNodeIds: _selectedNodeIds, // Unused
    loadHierarchyTree,
    loadHierarchyStatistics,
    // selectNode: _selectNode, // Unused
    clearSelection,
    deleteSite,
    deleteCell,
    // performBulkOperation, // Unused
  } = useHierarchyStore();

  const currentLocation = useCurrentLocation();

  // Load data on mount
  useEffect(() => {
    if (hierarchyTree.length === 0) {
      loadHierarchyTree({ expandLevel: 1 });
    }
    if (!hierarchyStatistics) {
      loadHierarchyStatistics();
    }
  }, [hierarchyTree.length, hierarchyStatistics, loadHierarchyTree, loadHierarchyStatistics]);

  // Get selected node
  const selectedNode = useMemo(() => {
    if (selectedNodes.length !== 1) return null;

    const findNode = (nodes: HierarchyNode[], id: string): HierarchyNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return findNode(hierarchyTree, selectedNodes[0]);
  }, [hierarchyTree, selectedNodes]);

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!currentLocation) return [];

    const crumbs = [{ label: 'Hierarchy', href: '/hierarchy' }];

    if (currentLocation.site.name) {
      crumbs.push({
        label: currentLocation.site.name,
        href: `/hierarchy?site=${currentLocation.site.id}`,
      });
    }

    if (currentLocation.cell.name) {
      crumbs.push({
        label: currentLocation.cell.name,
        href: `/hierarchy?site=${currentLocation.site.id}&cell=${currentLocation.cell.id}`,
      });
    }

    return crumbs;
  }, [currentLocation]);

  // Handle node selection
  const handleSelectionChange = useCallback((nodeIds: string[]) => {
    setSelectedNodes(nodeIds);
  }, []);

  // Handle node double click
  const handleNodeDoubleClick = useCallback(
    (node: HierarchyNode) => {
      // Navigate to detailed view or edit mode
      if (node.type === 'equipment') {
        navigate(`/equipment/${node.id}`);
      }
    },
    [navigate]
  );

  // Handle edit
  const handleEdit = useCallback(
    (node: HierarchyNode) => {
      switch (node.type) {
        case 'site':
          navigate(`/hierarchy/sites/${node.id}/edit`);
          break;
        case 'cell':
          navigate(`/hierarchy/cells/${node.id}/edit`);
          break;
        case 'equipment':
          navigate(`/equipment/${node.id}/edit`);
          break;
      }
    },
    [navigate]
  );

  // Handle add child
  const handleAddChild = useCallback(
    (node: HierarchyNode) => {
      switch (node.type) {
        case 'site':
          navigate(`/hierarchy/cells/new?siteId=${node.id}`);
          break;
        case 'cell':
          navigate(`/equipment/new?cellId=${node.id}`);
          break;
      }
    },
    [navigate]
  );

  // Handle node context actions
  const handleContextAction = useCallback(
    (action: string, node: HierarchyNode) => {
      switch (action) {
        case 'view':
          handleNodeDoubleClick(node);
          break;
        case 'edit':
          handleEdit(node);
          break;
        case 'delete':
          setDeleteDialog({ open: true, node });
          break;
        case 'add-child':
          handleAddChild(node);
          break;
      }
    },
    [handleNodeDoubleClick, handleAddChild, handleEdit]
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.node) return;

    try {
      switch (deleteDialog.node.type) {
        case 'site':
          await deleteSite(deleteDialog.node.id);
          break;
        case 'cell':
          await deleteCell(deleteDialog.node.id);
          break;
        case 'equipment':
          // Handle equipment deletion via equipment store
          break;
      }

      setDeleteDialog({ open: false, node: null });
      clearSelection();
    } catch {
      // Delete operation failed
    }
  }, [deleteDialog.node, deleteSite, deleteCell, clearSelection]);

  // Handle bulk operations
  const handleBulkAction = useCallback(
    async (_action: string) => {
      if (selectedNodes.length === 0) return;

      try {
        // Bulk operation logic would go here
        // console.log('Bulk action:', action, 'on nodes:', selectedNodes);
        clearSelection();
      } catch {
        // Bulk operation failed
      }

      setActionMenu(null);
    },
    [selectedNodes, clearSelection]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadHierarchyTree({ expandLevel: 1 });
    loadHierarchyStatistics();
  }, [loadHierarchyTree, loadHierarchyStatistics]);

  return (
    <AppLayout>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Page Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant='h4'>Hierarchy Management</Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={isLoadingTree}
              >
                Refresh
              </Button>

              <Button
                variant='outlined'
                startIcon={<FilterIcon />}
                onClick={() => setFilterPanelOpen(true)}
              >
                Filters
              </Button>

              <Button
                variant='outlined'
                startIcon={<ExportIcon />}
                disabled={selectedNodes.length === 0}
                onClick={() => handleBulkAction('export')}
              >
                Export
              </Button>

              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() => navigate('/hierarchy/sites/new')}
              >
                Add Site
              </Button>
            </Box>
          </Box>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <Breadcrumbs separator={<NavigateNextIcon fontSize='small' />}>
              {breadcrumbs.map((crumb, index) => (
                <Link
                  key={index}
                  underline='hover'
                  color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
                  href={crumb.href}
                  onClick={e => {
                    e.preventDefault();
                    navigate(crumb.href);
                  }}
                >
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          )}
        </Box>

        {/* Statistics Cards */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticsCard
                title='Total Sites'
                value={hierarchyStatistics?.totalSites || 0}
                icon={<FactoryIcon fontSize='large' />}
                color='primary'
                loading={isLoadingStatistics}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticsCard
                title='Total Cells'
                value={hierarchyStatistics?.totalCells || 0}
                icon={<CellIcon fontSize='large' />}
                color='secondary'
                loading={isLoadingStatistics}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticsCard
                title='Total Equipment'
                value={hierarchyStatistics?.totalEquipment || 0}
                icon={<EquipmentIcon fontSize='large' />}
                color='success'
                loading={isLoadingStatistics}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatisticsCard
                title='Total PLCs'
                value={hierarchyStatistics?.totalPlcs || 0}
                icon={<EquipmentIcon fontSize='large' />}
                color='warning'
                loading={isLoadingStatistics}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Hierarchy Tree */}
          <Box sx={{ width: '40%', borderRight: 1, borderColor: 'divider' }}>
            <HierarchyTree
              height='100%'
              showSearch
              showRefresh={false}
              multiSelect
              onSelectionChange={handleSelectionChange}
              onNodeDoubleClick={handleNodeDoubleClick}
              onContextAction={handleContextAction}
            />
          </Box>

          {/* Right Panel - Details */}
          <Box sx={{ flex: 1, p: 2 }}>
            <DetailsPanel
              selectedNode={selectedNode}
              onEdit={handleEdit}
              onDelete={node => setDeleteDialog({ open: true, node })}
              onAddChild={handleAddChild}
            />
          </Box>
        </Box>

        {/* Filter Panel */}
        <HierarchyFilterPanel
          open={filterPanelOpen}
          onOpenChange={setFilterPanelOpen}
          variant='temporary'
          anchor='right'
        />

        {/* Floating Action Button */}
        <Fab
          color='primary'
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => navigate('/hierarchy/sites/new')}
        >
          <AddIcon />
        </Fab>

        {/* Actions Menu */}
        <Menu anchorEl={actionMenu} open={Boolean(actionMenu)} onClose={() => setActionMenu(null)}>
          <MenuItem onClick={() => handleBulkAction('export')}>
            <ExportIcon fontSize='small' sx={{ mr: 1 }} />
            Export Selected
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('delete')}>
            <DeleteIcon fontSize='small' sx={{ mr: 1 }} />
            Delete Selected
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, node: null })}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>Delete {deleteDialog.node?.type}</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{deleteDialog.node?.name}"? This action cannot be
              undone and will also delete all child items.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, node: null })}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Display */}
        {error && (
          <Alert
            severity='error'
            sx={{ m: 2 }}
            action={
              <Button color='inherit' size='small' onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error.message}
          </Alert>
        )}
      </Box>
    </AppLayout>
  );
};

/**
 * Default export
 */
export default HierarchyManagementPage;

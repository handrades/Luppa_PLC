/**
 * Hierarchy Tree Component
 * Material-UI TreeView for three-level hierarchy: Site → Cell → Equipment
 * Story 4.5: Site Hierarchy Management
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
  Add as AddIcon,
  GridView as CellIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Memory as EquipmentIcon,
  ExpandMore as ExpandMoreIcon,
  GetApp as ExportIcon,
  Factory as FactoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  VisibilityOff,
} from '@mui/icons-material';
import { useHierarchyStore } from '../../stores/hierarchy.store';
import { useDebounce } from '../../hooks/useDebounce';
import { Cell, HierarchyNode, Site } from '../../types/hierarchy';

/**
 * Props for the HierarchyTree component
 */
interface HierarchyTreeProps {
  /** Custom height for the tree container */
  height?: number | string;
  /** Whether to enable virtualization for large datasets */
  enableVirtualization?: boolean;
  /** Whether to show context menus */
  showContextMenu?: boolean;
  /** Whether to allow multi-selection */
  multiSelect?: boolean;
  /** Whether to show node badges with counts */
  showBadges?: boolean;
  /** Whether to show search functionality */
  showSearch?: boolean;
  /** Whether to show filter functionality */
  showFilters?: boolean;
  /** Whether to show refresh button */
  showRefresh?: boolean;
  /** Whether to show export functionality */
  showExport?: boolean;
  /** Default expansion level */
  defaultExpandLevel?: number;
  /** Callback when nodes are selected */
  onSelectionChange?: (selectedNodeIds: string[]) => void;
  /** Callback when a node is double-clicked */
  onNodeDoubleClick?: (node: HierarchyNode) => void;
  /** Callback when node context menu action is triggered */
  onContextAction?: (action: string, node: HierarchyNode) => void;
  /** Custom node renderer */
  renderNode?: (node: HierarchyNode) => React.ReactNode;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Context menu state interface
 */
interface ContextMenuState {
  node: HierarchyNode | null;
  mouseX: number;
  mouseY: number;
}

/**
 * Tree search component
 */
const TreeSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}> = ({ value, onChange, onClear, disabled }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <TextField
      size='small'
      placeholder='Search hierarchy...'
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      InputProps={{
        startAdornment: <SearchIcon color='action' sx={{ mr: 1 }} />,
        endAdornment: value && (
          <IconButton size='small' onClick={onClear}>
            <VisibilityOff fontSize='small' />
          </IconButton>
        ),
      }}
      fullWidth
    />
  </Box>
);

/**
 * Tree node component with virtualization support
 */
const TreeNodeComponent: React.FC<{
  node: HierarchyNode;
  selected: boolean;
  expanded: boolean;
  level: number;
  showBadges: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string, multiSelect: boolean) => void;
  onContextMenu: (event: React.MouseEvent, node: HierarchyNode) => void;
  onDoubleClick?: (node: HierarchyNode) => void;
  renderCustomNode?: (node: HierarchyNode) => React.ReactNode;
  searchQuery?: string;
}> = ({
  node,
  selected,
  expanded,
  level,
  showBadges,
  onToggle,
  onSelect,
  onContextMenu,
  onDoubleClick,
  renderCustomNode,
  searchQuery,
}) => {
  // Get appropriate icon for node type
  const getNodeIcon = (nodeType: string, hasChildren: boolean) => {
    switch (nodeType) {
      case 'site':
        return <FactoryIcon color={selected ? 'primary' : 'action'} />;
      case 'cell':
        return <CellIcon color={selected ? 'primary' : 'action'} />;
      case 'equipment':
        return <EquipmentIcon color={selected ? 'primary' : 'action'} />;
      default:
        return hasChildren ? expanded ? <ExpandMoreIcon /> : <ChevronRightIcon /> : null;
    }
  };

  // Get node counts for badges
  const getNodeCount = () => {
    if (!showBadges) return null;

    switch (node.type) {
      case 'site': {
        const site = node.metadata as Site;
        return site.equipmentCount || 0;
      }
      case 'cell': {
        const cell = node.metadata as Cell;
        return cell.equipmentCount || 0;
      }
      default:
        return null;
    }
  };

  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const count = getNodeCount();
  const hasChildren = node.children && node.children.length > 0;
  const icon = getNodeIcon(node.type, hasChildren);

  // Custom node renderer
  if (renderCustomNode) {
    return <Box>{renderCustomNode(node)}</Box>;
  }

  return (
    <TreeItem
      itemId={node.id}
      label={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.5,
            px: 1,
            borderRadius: 1,
            cursor: 'pointer',
            backgroundColor: selected ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: selected ? 'primary.light' : 'action.hover',
            },
          }}
          onClick={e => {
            e.preventDefault();
            onSelect(node.id, e.ctrlKey || e.metaKey);
          }}
          onDoubleClick={() => onDoubleClick?.(node)}
          onContextMenu={e => onContextMenu(e, node)}
        >
          {icon}
          <Typography
            variant='body2'
            sx={{
              flex: 1,
              fontWeight: selected ? 'medium' : 'normal',
              color: selected ? 'primary.contrastText' : 'text.primary',
            }}
          >
            {highlightText(node.name, searchQuery || '')}
          </Typography>

          {/* Node badges */}
          {count !== null && count > 0 && (
            <Badge
              badgeContent={count}
              color='primary'
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  height: 20,
                  minWidth: 20,
                },
              }}
            />
          )}

          {/* Node type chip */}
          <Chip
            label={node.type}
            size='small'
            variant='outlined'
            sx={{
              fontSize: '0.7rem',
              height: 20,
              textTransform: 'capitalize',
            }}
          />
        </Box>
      }
      sx={{
        '& .MuiTreeItem-content': {
          padding: 0,
        },
        '& .MuiTreeItem-group': {
          marginLeft: level > 0 ? 2 : 0,
          borderLeft: level > 0 ? '1px dashed rgba(0, 0, 0, 0.12)' : 'none',
        },
      }}
    >
      {/* Render children */}
      {hasChildren &&
        expanded &&
        node.children.map(child => (
          <TreeNodeComponent
            key={child.id}
            node={child}
            selected={selected}
            expanded={expanded}
            level={level + 1}
            showBadges={showBadges}
            onToggle={onToggle}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            onDoubleClick={onDoubleClick}
            renderCustomNode={renderCustomNode}
            searchQuery={searchQuery}
          />
        ))}
    </TreeItem>
  );
};

/**
 * Main Hierarchy Tree Component
 */
export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  height = 600,
  // enableVirtualization = true, // Unused
  showContextMenu = true,
  multiSelect = true,
  showBadges = true,
  showSearch = true,
  // showFilters = false, // Unused
  showRefresh = true,
  showExport = false,
  defaultExpandLevel = 1,
  onSelectionChange,
  onNodeDoubleClick,
  onContextAction,
  renderNode,
  'data-testid': testId,
}) => {
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    node: null,
    mouseX: 0,
    mouseY: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Refs
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const {
    hierarchyTree,
    expandedNodes,
    selectedNodeIds,
    isLoadingTree,
    error,
    loadHierarchyTree,
    toggleNodeExpansion,
    selectNode,
    // selectMultipleNodes, // Unused
    clearSelection,
    expandToLevel,
    collapseAll,
    expandAll,
    setSearchQuery: setStoreSearchQuery,
    performBulkOperation,
  } = useHierarchyStore();

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Update store search query when debounced value changes
  useEffect(() => {
    setStoreSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setStoreSearchQuery]);

  // Load tree on mount
  useEffect(() => {
    if (hierarchyTree.length === 0) {
      loadHierarchyTree({ expandLevel: defaultExpandLevel });
    }
  }, [hierarchyTree.length, loadHierarchyTree, defaultExpandLevel]);

  // Expand to default level on mount
  useEffect(() => {
    if (hierarchyTree.length > 0 && expandedNodes.size === 0) {
      expandToLevel(defaultExpandLevel);
    }
  }, [hierarchyTree.length, expandedNodes.size, expandToLevel, defaultExpandLevel]);

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedNodeIds));
    }
  }, [selectedNodeIds, onSelectionChange]);

  // Filter tree nodes based on search query
  const filteredTree = useMemo(() => {
    if (!debouncedSearchQuery) return hierarchyTree;

    const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.reduce((acc: HierarchyNode[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            visible: matchesSearch,
          });
        }

        return acc;
      }, []);
    };

    return filterNodes(hierarchyTree);
  }, [hierarchyTree, debouncedSearchQuery]);

  // Handle node selection
  const handleNodeSelect = useCallback(
    (nodeId: string, isMultiSelect: boolean) => {
      if (multiSelect && isMultiSelect) {
        selectNode(nodeId);
      } else {
        clearSelection();
        selectNode(nodeId);
      }
    },
    [multiSelect, selectNode, clearSelection]
  );

  // Handle node toggle
  const handleNodeToggle = useCallback(
    (nodeId: string) => {
      toggleNodeExpansion(nodeId);
    },
    [toggleNodeExpansion]
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: HierarchyNode) => {
      if (!showContextMenu) return;

      event.preventDefault();
      setContextMenu({
        node,
        mouseX: event.clientX - 2,
        mouseY: event.clientY - 4,
      });
    },
    [showContextMenu]
  );

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenu({ node: null, mouseX: 0, mouseY: 0 });
  }, []);

  // Handle context menu actions
  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu.node) return;

      const node = contextMenu.node;
      handleContextMenuClose();

      switch (action) {
        case 'view':
          onContextAction?.('view', node);
          break;
        case 'edit':
          onContextAction?.('edit', node);
          break;
        case 'delete':
          setConfirmDialog({
            open: true,
            title: `Delete ${node.type}`,
            message: `Are you sure you want to delete "${node.name}"? This action cannot be undone.`,
            action: () => {
              onContextAction?.('delete', node);
              setConfirmDialog(prev => ({ ...prev, open: false }));
            },
          });
          break;
        case 'add-child':
          onContextAction?.('add-child', node);
          break;
        case 'expand-all':
          expandAll();
          break;
        case 'collapse-all':
          collapseAll();
          break;
        default:
          onContextAction?.(action, node);
      }
    },
    [contextMenu.node, handleContextMenuClose, onContextAction, expandAll, collapseAll]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadHierarchyTree({ expandLevel: defaultExpandLevel });
  }, [loadHierarchyTree, defaultExpandLevel]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      await performBulkOperation({
        operation: 'export',
        entityType: 'site',
        entityIds: Array.from(selectedNodeIds),
        params: { format: 'json', includeEquipment: true },
      });
    } catch (error) {
      // Export operation failed
    }
  }, [performBulkOperation, selectedNodeIds]);

  // Render loading state
  if (isLoadingTree && hierarchyTree.length === 0) {
    return (
      <Box sx={{ p: 2 }} data-testid={testId}>
        <Typography variant='h6' gutterBottom>
          Hierarchy Tree
        </Typography>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant='rectangular' height={40} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  // Render error state
  if (error && hierarchyTree.length === 0) {
    return (
      <Box sx={{ p: 2 }} data-testid={testId}>
        <Alert severity='error' sx={{ mb: 2 }}>
          Failed to load hierarchy: {error.message}
        </Alert>
        <Button variant='outlined' onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height, display: 'flex', flexDirection: 'column' }} data-testid={testId}>
      {/* Header with controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant='h6'>Hierarchy Tree</Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {showRefresh && (
              <Tooltip title='Refresh'>
                <IconButton size='small' onClick={handleRefresh} disabled={isLoadingTree}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}

            {showExport && selectedNodeIds.size > 0 && (
              <Tooltip title='Export Selected'>
                <IconButton size='small' onClick={handleExport}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title='Expand All'>
              <IconButton size='small' onClick={() => expandAll()}>
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title='Collapse All'>
              <IconButton size='small' onClick={() => collapseAll()}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Search */}
        {showSearch && (
          <TreeSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            disabled={isLoadingTree}
          />
        )}

        {/* Selection info */}
        {selectedNodeIds.size > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={`${selectedNodeIds.size} selected`}
              size='small'
              onDelete={() => clearSelection()}
            />
          </Box>
        )}
      </Box>

      {/* Tree content */}
      <Box
        ref={treeContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1,
        }}
      >
        {filteredTree.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='body2' color='text.secondary'>
              {debouncedSearchQuery
                ? `No results found for "${debouncedSearchQuery}"`
                : 'No hierarchy data available'}
            </Typography>
          </Box>
        ) : (
          <SimpleTreeView
            expandedItems={Array.from(expandedNodes)}
            selectedItems={Array.from(selectedNodeIds)}
            onExpandedItemsChange={(_event: React.SyntheticEvent | null, _itemIds: string[]) => {
              // SimpleTreeView handles expansion internally, we just sync with store
            }}
            onSelectedItemsChange={(
              _event: React.SyntheticEvent | null,
              _itemIds: string[] | string | null
            ) => {
              // We handle selection manually to support multi-select
            }}
            multiSelect={multiSelect}
          >
            {filteredTree.map(node => (
              <TreeNodeComponent
                key={node.id}
                node={node}
                selected={selectedNodeIds.has(node.id)}
                expanded={expandedNodes.has(node.id)}
                level={0}
                showBadges={showBadges}
                onToggle={handleNodeToggle}
                onSelect={handleNodeSelect}
                onContextMenu={handleContextMenu}
                onDoubleClick={onNodeDoubleClick}
                renderCustomNode={renderNode}
                searchQuery={debouncedSearchQuery}
              />
            ))}
          </SimpleTreeView>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        open={Boolean(contextMenu.node)}
        onClose={handleContextMenuClose}
        anchorReference='anchorPosition'
        anchorPosition={
          contextMenu.node !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleContextAction('view')}>
          <ViewIcon fontSize='small' sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleContextAction('edit')}>
          <EditIcon fontSize='small' sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleContextAction('add-child')}>
          <AddIcon fontSize='small' sx={{ mr: 1 }} />
          Add Child
        </MenuItem>
        <MenuItem onClick={() => handleContextAction('expand-all')}>
          <ExpandMoreIcon fontSize='small' sx={{ mr: 1 }} />
          Expand All
        </MenuItem>
        <MenuItem onClick={() => handleContextAction('collapse-all')}>
          <ChevronRightIcon fontSize='small' sx={{ mr: 1 }} />
          Collapse All
        </MenuItem>
        <MenuItem onClick={() => handleContextAction('delete')} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize='small' sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        maxWidth='sm'
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button onClick={confirmDialog.action} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/**
 * Memoized version for performance
 */
export const MemoizedHierarchyTree = React.memo(HierarchyTree);

/**
 * Default export
 */
export default HierarchyTree;

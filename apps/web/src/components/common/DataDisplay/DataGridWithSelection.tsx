import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Paper, IconButton, Checkbox, Button, Menu, MenuItem } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import DownloadIcon from '@mui/icons-material/Download';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  SortableColumnHeader, 
  SortState, 
  sortData, 
  updateSortState 
} from './SortableColumnHeader';
import {
  ColumnFilter,
  FilterValue,
  FilterType,
  filterData,
} from './ColumnFilter';
import { exportDataToCSV } from '../../../utils/exportToCSV';

export interface Column<T = any> {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: { value: string; label: string }[];
  resizable?: boolean;
  reorderable?: boolean;
}

export interface DataGridProps<T = any> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  height?: number | string;
  width?: number | string;
  overscanRowCount?: number;
  overscanColumnCount?: number;
  onRowClick?: (row: T, index: number) => void;
  rowKey?: (row: T, index?: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  sortable?: boolean;
  multiSort?: boolean;
  onSortChange?: (sortState: SortState[]) => void;
  filterable?: boolean;
  onFilterChange?: (filters: FilterValue[]) => void;
  getValueFn?: (item: T, columnId: string) => any;
  resizable?: boolean;
  reorderable?: boolean;
  persistLayoutKey?: string;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnReorder?: (columns: Column<T>[]) => void;
  selectable?: boolean;
  selectionMode?: 'single' | 'multiple';
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  exportable?: boolean;
  exportFilename?: string;
  stickyFirstColumn?: boolean;
  mobileBreakpoint?: number;
}

const GridContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'auto',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
}));

const GridHeader = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  display: 'flex',
  backgroundColor: theme.palette.grey[100],
  borderBottom: `2px solid ${theme.palette.divider}`,
  fontWeight: theme.typography.fontWeightMedium,
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.875rem',
  },
}));

const GridHeaderCell = styled(Box)<{ sticky?: boolean }>(({ theme, sticky }) => ({
  padding: theme.spacing(1, 2),
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  position: sticky ? 'sticky' : 'relative',
  left: sticky ? 0 : 'auto',
  backgroundColor: sticky ? theme.palette.grey[100] : 'transparent',
  zIndex: sticky ? 2 : 1,
  userSelect: 'none',
  '&:last-child': {
    borderRight: 'none',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5, 1),
  },
}));

const ResizeHandle = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 4,
  cursor: 'col-resize',
  backgroundColor: 'transparent',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
  },
  '&.resizing': {
    backgroundColor: theme.palette.primary.main,
  },
}));

const GridRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child': {
    borderBottom: 'none',
  },
  '&.selected': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const GridCell = styled(Box)<{ sticky?: boolean }>(({ theme, sticky }) => ({
  padding: theme.spacing(1, 2),
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  position: sticky ? 'sticky' : 'relative',
  left: sticky ? 0 : 'auto',
  backgroundColor: sticky ? theme.palette.background.paper : 'transparent',
  zIndex: sticky ? 1 : 0,
  '&:last-child': {
    borderRight: 'none',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5, 1),
    fontSize: '0.875rem',
  },
}));

const VirtualGridContent = styled(Box)({
  position: 'relative',
});

const MobileScrollContainer = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
}));

const ExportToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(1),
}));

// Draggable column header component
function DraggableColumnHeader<T = any>({
  column,
  sortable,
  sortState,
  onSort,
  filterable,
  filters,
  onFilterChange,
  onResize,
  resizable,
}: {
  column: Column<T>;
  sortable: boolean;
  sortState: SortState[];
  onSort: (columnId: string, shiftKey?: boolean) => void;
  filterable: boolean;
  filters: FilterValue[];
  onFilterChange: (columnId: string, filter: FilterValue | null) => void;
  onResize?: (columnId: string, width: number) => void;
  resizable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = column.width || column.minWidth || 150;
  }, [column]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(
        column.minWidth || 50,
        Math.min(column.maxWidth || 1000, startWidth.current + diff)
      );
      if (onResize) {
        onResize(column.id, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, column, onResize]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: column.width || column.minWidth || 150,
  };

  return (
    <GridHeaderCell
      ref={setNodeRef}
      style={style}
      {...(column.reorderable !== false ? attributes : {})}
      {...(column.reorderable !== false ? listeners : {})}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {sortable ? (
          <SortableColumnHeader
            columnId={column.id}
            label={column.label}
            sortable={column.sortable !== false}
            sortState={sortState}
            onSort={onSort}
            align={column.align}
          />
        ) : (
          <Box sx={{ flex: 1 }}>{column.label}</Box>
        )}
        {filterable && column.filterable !== false && (
          <ColumnFilter
            columnId={column.id}
            label={column.label}
            type={column.filterType || 'text'}
            options={column.filterOptions}
            filterValue={filters.find((f) => f.columnId === column.id)}
            onFilterChange={(filter) => onFilterChange(column.id, filter)}
          />
        )}
      </Box>
      {resizable && column.resizable !== false && (
        <ResizeHandle
          className={isResizing ? 'resizing' : ''}
          onMouseDown={handleResizeStart}
        />
      )}
    </GridHeaderCell>
  );
}

export function DataGridWithSelection<T = any>({
  data,
  columns: initialColumns,
  rowHeight = 52,
  height = 600,
  width = '100%',
  overscanRowCount = 10,
  overscanColumnCount = 3,
  onRowClick,
  rowKey = (_row: T, index?: number) => index || 0,
  loading = false,
  emptyMessage = 'No data available',
  sortable = false,
  multiSort = false,
  onSortChange,
  filterable = false,
  onFilterChange,
  getValueFn,
  resizable = false,
  reorderable = false,
  persistLayoutKey,
  onColumnResize,
  onColumnReorder,
  selectable = false,
  selectionMode = 'multiple',
  selectedRows: externalSelectedRows,
  onSelectionChange,
  exportable = false,
  exportFilename = 'data_export',
  stickyFirstColumn = false,
  mobileBreakpoint: _mobileBreakpoint = 600,
}: DataGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Sort state management
  const [sortState, setSortState] = useState<SortState[]>([]);
  
  // Filter state management
  const [filters, setFilters] = useState<FilterValue[]>([]);
  
  // Selection state management
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<string | number>>(new Set());
  const selectedRows = externalSelectedRows || internalSelectedRows;
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // Export menu state
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const exportMenuOpen = Boolean(exportMenuAnchor);
  
  // Column state management with persistence
  const [columns, setColumns] = useState<Column<T>[]>(() => {
    if (persistLayoutKey) {
      const savedLayout = localStorage.getItem(`datagrid-layout-${persistLayoutKey}`);
      if (savedLayout) {
        try {
          const { columnOrder, columnWidths } = JSON.parse(savedLayout);
          // Apply saved order and widths
          const orderedColumns = columnOrder
            .map((id: string) => initialColumns.find(c => c.id === id))
            .filter(Boolean);
          // Add any new columns that weren't in saved layout
          const newColumns = initialColumns.filter(
            c => !columnOrder.includes(c.id)
          );
          const allColumns = [...orderedColumns, ...newColumns];
          // Apply saved widths
          return allColumns.map(c => ({
            ...c,
            width: columnWidths[c.id] || c.width || c.minWidth || 150,
          }));
        } catch {
          // Failed to restore column layout - use defaults
        }
      }
    }
    return initialColumns;
  });

  // Save layout to localStorage when columns change
  useEffect(() => {
    if (persistLayoutKey) {
      const columnOrder = columns.map(c => c.id);
      const columnWidths = columns.reduce((acc, c) => {
        acc[c.id] = c.width || c.minWidth || 150;
        return acc;
      }, {} as Record<string, number>);
      localStorage.setItem(
        `datagrid-layout-${persistLayoutKey}`,
        JSON.stringify({ columnOrder, columnWidths })
      );
    }
  }, [columns, persistLayoutKey]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle column drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((c) => c.id === active.id);
        const newIndex = items.findIndex((c) => c.id === over?.id);
        const newColumns = arrayMove(items, oldIndex, newIndex);
        if (onColumnReorder) {
          onColumnReorder(newColumns);
        }
        return newColumns;
      });
    }
  }, [onColumnReorder]);

  // Handle column resize
  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId ? { ...col, width } : col
      )
    );
    if (onColumnResize) {
      onColumnResize(columnId, width);
    }
  }, [onColumnResize]);

  // Reset layout to default
  const resetLayout = useCallback(() => {
    setColumns(initialColumns);
    if (persistLayoutKey) {
      localStorage.removeItem(`datagrid-layout-${persistLayoutKey}`);
    }
  }, [initialColumns, persistLayoutKey]);

  // Handle sort changes
  const handleSort = useCallback((columnId: string, shiftKey?: boolean) => {
    const newSortState = updateSortState(sortState, columnId, multiSort && shiftKey);
    setSortState(newSortState);
    if (onSortChange) {
      onSortChange(newSortState);
    }
  }, [sortState, multiSort, onSortChange]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((columnId: string, filter: FilterValue | null) => {
    const newFilters = [...filters];
    const existingIndex = newFilters.findIndex((f) => f.columnId === columnId);
    
    if (filter) {
      if (existingIndex >= 0) {
        newFilters[existingIndex] = filter;
      } else {
        newFilters.push(filter);
      }
    } else if (existingIndex >= 0) {
      newFilters.splice(existingIndex, 1);
    }
    
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  }, [filters, onFilterChange]);
  
  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Apply filters first
    if (filters.length > 0) {
      result = filterData(result, filters, getValueFn);
    }
    
    // Then apply sorting
    if (sortState.length > 0) {
      result = sortData(result, sortState, getValueFn);
    }
    
    return result;
  }, [data, filters, sortState, getValueFn]);

  // Handle row selection
  const handleRowSelection = useCallback(
    (row: T, index: number, event?: React.MouseEvent) => {
      const key = typeof rowKey === 'function' ? rowKey(row, index) : index;
      const newSelection = new Set(selectedRows);
      
      if (selectionMode === 'single') {
        if (newSelection.has(key)) {
          newSelection.clear();
        } else {
          newSelection.clear();
          newSelection.add(key);
        }
      } else if (selectionMode === 'multiple') {
        if (event?.shiftKey && lastSelectedIndex !== null) {
          // Range selection
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i++) {
            const rangeKey = typeof rowKey === 'function' ? rowKey(processedData[i], i) : i;
            newSelection.add(rangeKey);
          }
        } else if (event?.ctrlKey || event?.metaKey) {
          // Toggle individual selection
          if (newSelection.has(key)) {
            newSelection.delete(key);
          } else {
            newSelection.add(key);
          }
        } else {
          // Regular click - toggle or replace selection
          if (newSelection.has(key)) {
            newSelection.delete(key);
          } else {
            if (!event?.ctrlKey && !event?.metaKey) {
              newSelection.clear();
            }
            newSelection.add(key);
          }
        }
      }
      
      setLastSelectedIndex(index);
      
      if (onSelectionChange) {
        onSelectionChange(newSelection);
      } else {
        setInternalSelectedRows(newSelection);
      }
    },
    [selectedRows, selectionMode, lastSelectedIndex, processedData, rowKey, onSelectionChange]
  );
  
  // Handle select all/none
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const newSelection = new Set<string | number>();
      
      if (checked) {
        processedData.forEach((row, index) => {
          const key = typeof rowKey === 'function' ? rowKey(row, index) : index;
          newSelection.add(key);
        });
      }
      
      if (onSelectionChange) {
        onSelectionChange(newSelection);
      } else {
        setInternalSelectedRows(newSelection);
      }
    },
    [processedData, rowKey, onSelectionChange]
  );
  
  // Handle row click
  const handleRowClick = useCallback(
    (row: T, index: number, event: React.MouseEvent) => {
      if (selectable) {
        handleRowSelection(row, index, event);
      }
      if (onRowClick) {
        onRowClick(row, index);
      }
    },
    [onRowClick, selectable, handleRowSelection]
  );
  
  // Check if all rows are selected
  const isAllSelected = useMemo(() => {
    if (processedData.length === 0) return false;
    return processedData.every((row, index) => {
      const key = typeof rowKey === 'function' ? rowKey(row, index) : index;
      return selectedRows.has(key);
    });
  }, [processedData, selectedRows, rowKey]);
  
  // Check if some rows are selected
  const isSomeSelected = useMemo(() => {
    if (processedData.length === 0) return false;
    return processedData.some((row, index) => {
      const key = typeof rowKey === 'function' ? rowKey(row, index) : index;
      return selectedRows.has(key);
    }) && !isAllSelected;
  }, [processedData, selectedRows, rowKey, isAllSelected]);
  
  // Handle CSV export
  const handleExportClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  }, []);
  
  const handleExportClose = useCallback(() => {
    setExportMenuAnchor(null);
  }, []);
  
  const handleExportAll = useCallback(() => {
    exportDataToCSV(processedData, columns, {
      filename: `${exportFilename}_all_${new Date().toISOString().split('T')[0]}`,
      rowKey,
    });
    handleExportClose();
  }, [processedData, columns, exportFilename, rowKey]);
  
  const handleExportFiltered = useCallback(() => {
    exportDataToCSV(processedData, columns, {
      filename: `${exportFilename}_filtered_${new Date().toISOString().split('T')[0]}`,
      rowKey,
    });
    handleExportClose();
  }, [processedData, columns, exportFilename, rowKey]);
  
  const handleExportSelected = useCallback(() => {
    exportDataToCSV(processedData, columns, {
      selectedRows,
      filename: `${exportFilename}_selected_${new Date().toISOString().split('T')[0]}`,
      rowKey,
    });
    handleExportClose();
  }, [processedData, columns, selectedRows, exportFilename, rowKey]);

  // Adjust row height for mobile
  const adjustedRowHeight = isMobile ? rowHeight * 0.8 : rowHeight;
  
  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => adjustedRowHeight, [adjustedRowHeight]),
    overscan: isMobile ? 5 : overscanRowCount,
  });

  // Column virtualizer for horizontal scrolling
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const col = columns[index];
        const baseWidth = col.width || col.minWidth || 150;
        return isMobile ? Math.min(baseWidth, 120) : baseWidth;
      },
      [columns, isMobile]
    ),
    overscan: isMobile ? 2 : overscanColumnCount,
  });

  // Calculate total width for columns  
  const totalColumnsWidth = useMemo(() => {
    const baseWidth = columns.reduce((acc, col) => acc + (col.width || col.minWidth || 150), 0);
    return selectable ? baseWidth + 48 : baseWidth; // Add 48px for checkbox column
  }, [columns, selectable]);

  // Render cell
  const renderCell = useCallback(
    (row: T, column: Column<T>, virtualColumn: any) => {
      const value = (row as any)[column.id];
      const displayValue = column.format ? column.format(value, row) : value;

      return (
        <GridCell
          key={column.id}
          role="gridcell"
          aria-label={`${column.label}: ${displayValue}`}
          sx={{
            width: virtualColumn.size,
            position: 'absolute',
            left: 0,
            transform: `translateX(${virtualColumn.start}px)`,
            textAlign: column.align || 'left',
          }}
        >
          {displayValue}
        </GridCell>
      );
    },
    []
  );

  if (loading) {
    return (
      <Paper sx={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ height, width, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {emptyMessage}
      </Paper>
    );
  }

  return (
    <Box>
      {exportable && (
        <ExportToolbar>
          <Button
            startIcon={<DownloadIcon />}
            onClick={handleExportClick}
            size="small"
            variant="outlined"
          >
            Export CSV
          </Button>
          <Menu
            anchorEl={exportMenuAnchor}
            open={exportMenuOpen}
            onClose={handleExportClose}
          >
            <MenuItem onClick={handleExportAll}>
              Export All ({data.length} rows)
            </MenuItem>
            {filters.length > 0 && (
              <MenuItem onClick={handleExportFiltered}>
                Export Filtered ({processedData.length} rows)
              </MenuItem>
            )}
            {selectedRows.size > 0 && (
              <MenuItem onClick={handleExportSelected}>
                Export Selected ({selectedRows.size} rows)
              </MenuItem>
            )}
          </Menu>
        </ExportToolbar>
      )}
      <MobileScrollContainer>
        <GridContainer
          ref={parentRef}
          role="grid"
          aria-label="Data grid"
          aria-rowcount={processedData.length}
          aria-colcount={columns.length + (selectable ? 1 : 0)}
          tabIndex={0}
          sx={{
            height,
            width,
            outline: 'none',
            '&:focus': {
              boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
            },
          }}
          onKeyDown={(e) => {
            // Keyboard navigation
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              // Navigate rows
            } else if (e.key === ' ' && selectable) {
              e.preventDefault();
              // Toggle selection
            } else if (e.key === 'a' && (e.ctrlKey || e.metaKey) && selectable && selectionMode === 'multiple') {
              e.preventDefault();
              handleSelectAll(!isAllSelected);
            }
          }}
        >
      <GridHeader
        role="row"
        aria-rowindex={1}
        sx={{
          width: totalColumnsWidth,
          minWidth: '100%',
        }}
      >
        {persistLayoutKey && (
          <IconButton
            size="small"
            onClick={resetLayout}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 11,
            }}
            title="Reset layout to default"
          >
            <RestoreIcon fontSize="small" />
          </IconButton>
        )}
        
        {/* Checkbox column header */}
        {selectable && (
          <GridHeaderCell
            role="columnheader"
            aria-label="Select all rows"
            sticky={stickyFirstColumn && isMobile}
            sx={{
              width: 48,
              position: 'absolute',
              left: 0,
              transform: 'translateX(0px)',
            }}
          >
            {selectionMode === 'multiple' && (
              <Checkbox
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                size="small"
                inputProps={{
                  'aria-label': isAllSelected ? 'Deselect all rows' : 'Select all rows',
                }}
              />
            )}
          </GridHeaderCell>
        )}
        
        {/* Regular column headers */}
        {reorderable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map(c => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const column = columns[virtualColumn.index];
                const left = selectable ? virtualColumn.start + 48 : virtualColumn.start;
                return (
                  <Box
                    key={column.id}
                    sx={{
                      position: 'absolute',
                      left: 0,
                      transform: `translateX(${left}px)`,
                    }}
                  >
                    <DraggableColumnHeader
                      column={column}
                      sortable={sortable}
                      sortState={sortState}
                      onSort={handleSort}
                      filterable={filterable}
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onResize={handleColumnResize}
                      resizable={resizable}
                    />
                  </Box>
                );
              })}
            </SortableContext>
          </DndContext>
        ) : (
          columnVirtualizer.getVirtualItems().map((virtualColumn) => {
            const column = columns[virtualColumn.index];
            const left = selectable ? virtualColumn.start + 48 : virtualColumn.start;
            return (
              <GridHeaderCell
                key={column.id}
                sx={{
                  width: virtualColumn.size,
                  position: 'absolute',
                  left: 0,
                  transform: `translateX(${left}px)`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {sortable ? (
                    <SortableColumnHeader
                      columnId={column.id}
                      label={column.label}
                      sortable={column.sortable !== false}
                      sortState={sortState}
                      onSort={handleSort}
                      align={column.align}
                    />
                  ) : (
                    <Box sx={{ flex: 1 }}>{column.label}</Box>
                  )}
                  {filterable && column.filterable !== false && (
                    <ColumnFilter
                      columnId={column.id}
                      label={column.label}
                      type={column.filterType || 'text'}
                      options={column.filterOptions}
                      filterValue={filters.find((f) => f.columnId === column.id)}
                      onFilterChange={(filter) => handleFilterChange(column.id, filter)}
                    />
                  )}
                </Box>
                {resizable && column.resizable !== false && (
                  <ResizeHandle
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startWidth = column.width || column.minWidth || 150;
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const diff = e.clientX - startX;
                        const newWidth = Math.max(
                          column.minWidth || 50,
                          Math.min(column.maxWidth || 1000, startWidth + diff)
                        );
                        handleColumnResize(column.id, newWidth);
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                )}
              </GridHeaderCell>
            );
          })
        )}
      </GridHeader>
      
      <VirtualGridContent
        sx={{
          height: rowVirtualizer.getTotalSize(),
          width: totalColumnsWidth,
          minWidth: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = processedData[virtualRow.index];
          const key = typeof rowKey === 'function' ? rowKey(row, virtualRow.index) : virtualRow.index;
          const virtualColumns = columnVirtualizer.getVirtualItems();
          const isSelected = selectedRows.has(key);
          
          return (
            <GridRow
              key={key}
              role="row"
              aria-rowindex={virtualRow.index + 2}
              aria-selected={isSelected}
              onClick={(e) => handleRowClick(row, virtualRow.index, e)}
              className={isSelected ? 'selected' : ''}
              tabIndex={virtualRow.index === 0 ? 0 : -1}
              sx={{
                height: virtualRow.size,
                position: 'absolute',
                top: 0,
                left: 0,
                width: totalColumnsWidth,
                minWidth: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Checkbox cell */}
              {selectable && (
                <GridCell
                  role="gridcell"
                  sticky={stickyFirstColumn && isMobile}
                  sx={{
                    width: 48,
                    position: 'absolute',
                    left: 0,
                    transform: 'translateX(0px)',
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowSelection(row, virtualRow.index);
                    }}
                    size="small"
                    inputProps={{
                      'aria-label': `Select row ${virtualRow.index + 1}`,
                    }}
                  />
                </GridCell>
              )}
              
              {/* Regular cells */}
              {virtualColumns.map((virtualColumn) => {
                const column = columns[virtualColumn.index];
                const left = selectable ? virtualColumn.start + 48 : virtualColumn.start;
                return renderCell(row, column, {
                  ...virtualColumn,
                  start: left,
                });
              })}
            </GridRow>
          );
        })}
      </VirtualGridContent>
        </GridContainer>
      </MobileScrollContainer>
    </Box>
  );
}
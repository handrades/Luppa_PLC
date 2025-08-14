import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestoreIcon from '@mui/icons-material/Restore';
import { styled } from '@mui/material/styles';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ColumnConfig {
  id: string;
  width: number;
  order: number;
}

export interface ResizableColumnsProps {
  columns: ColumnConfig[];
  onColumnResize: (_columnId: string, _newWidth: number) => void;
  onColumnReorder: (_newOrder: ColumnConfig[]) => void;
  onReset?: () => void;
  minColumnWidth?: number;
  maxColumnWidth?: number;
  persistKey?: string;
}

const ResizeHandle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: 4,
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    opacity: 0.5,
  },
  '&.resizing': {
    backgroundColor: theme.palette.primary.main,
    opacity: 0.8,
  },
}));

const DragHandle = styled(Box)(() => ({
  cursor: 'move',
  display: 'flex',
  alignItems: 'center',
  opacity: 0.5,
  '&:hover': {
    opacity: 1,
  },
}));

interface SortableColumnProps {
  columnId: string;
  children: React.ReactNode;
  isDraggable?: boolean;
}

export function SortableColumn({ columnId, children, isDraggable = true }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ position: 'relative' }}>
      {isDraggable && (
        <DragHandle {...attributes} {...listeners}>
          <DragIndicatorIcon fontSize='small' />
        </DragHandle>
      )}
      {children}
    </Box>
  );
}

export function ResizableColumns({
  columns,
  onColumnResize,
  onColumnReorder,
  onReset,
  minColumnWidth = 50,
  maxColumnWidth = 500,
  persistKey,
}: ResizableColumnsProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [resizing, setResizing] = useState<string | null>(null);
  const columnsRef = useRef<ColumnConfig[]>(localColumns);
  const resizeRef = useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: 0,
  });

  // Update columnsRef when localColumns changes
  useEffect(() => {
    columnsRef.current = localColumns;
  }, [localColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load persisted column config
  useEffect(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`grid-columns-${persistKey}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLocalColumns(parsed);
          onColumnReorder(parsed);
        } catch {
          // Failed to load column configuration - use defaults
        }
      }
    }
  }, [persistKey, onColumnReorder]);

  // Save column config
  const saveColumns = useCallback(
    (cols: ColumnConfig[]) => {
      if (persistKey) {
        localStorage.setItem(`grid-columns-${persistKey}`, JSON.stringify(cols));
      }
    },
    [persistKey]
  );

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const column = columnsRef.current.find(c => c.id === columnId);
      if (!column) return;

      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      resizeRef.current = { startX, startWidth: column.width };
      setResizing(columnId);
    },
    []
  );

  // Handle resize move
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const diff = currentX - resizeRef.current.startX;
      const newWidth = Math.max(
        minColumnWidth,
        Math.min(maxColumnWidth, resizeRef.current.startWidth + diff)
      );

      setLocalColumns(prev =>
        prev.map(col => (col.id === resizing ? { ...col, width: newWidth } : col))
      );
      onColumnResize(resizing, newWidth);
    };

    const handleMouseUp = () => {
      if (resizing) {
        // Use the latest columns from the ref
        const latestColumns = columnsRef.current;
        const column = latestColumns.find(c => c.id === resizing);
        if (column) {
          saveColumns(latestColumns);
        }
        setResizing(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [resizing, minColumnWidth, maxColumnWidth, onColumnResize, saveColumns]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const currentColumns = columnsRef.current;
        const oldIndex = currentColumns.findIndex(col => col.id === active.id);
        const newIndex = currentColumns.findIndex(col => col.id === over.id);

        const newColumns = arrayMove(currentColumns, oldIndex, newIndex).map((col, index) => ({
          ...col,
          order: index,
        }));

        setLocalColumns(newColumns);
        onColumnReorder(newColumns);
        saveColumns(newColumns);
      }
    },
    [onColumnReorder, saveColumns]
  );

  // Handle reset
  const handleReset = useCallback(() => {
    setLocalColumns(columns);
    onColumnReorder(columns);
    if (persistKey) {
      localStorage.removeItem(`grid-columns-${persistKey}`);
    }
    if (onReset) {
      onReset();
    }
  }, [columns, onColumnReorder, onReset, persistKey]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={localColumns.map(col => col.id)}
        strategy={horizontalListSortingStrategy}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {localColumns.map(column => (
            <Box
              key={column.id}
              sx={{
                width: column.width,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <ResizeHandle
                className={resizing === column.id ? 'resizing' : ''}
                onMouseDown={e => handleResizeStart(e, column.id)}
                onTouchStart={e => handleResizeStart(e, column.id)}
              />
            </Box>
          ))}
          {onReset && (
            <IconButton
              size='small'
              onClick={handleReset}
              title='Reset column layout'
              sx={{ ml: 1 }}
            >
              <RestoreIcon fontSize='small' />
            </IconButton>
          )}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

// Re-export column utilities from shared utils
export { getDefaultColumnConfig, applyColumnConfig } from '../../../utils/columnUtils';

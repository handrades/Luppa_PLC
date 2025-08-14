import React from 'react';
import { Box, IconButton } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { styled } from '@mui/material/styles';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  columnId: string;
  direction: SortDirection;
  priority: number;
}

export interface SortableColumnHeaderProps {
  columnId: string;
  label: string;
  sortable?: boolean;
  sortState?: SortState[];
  onSort?: (columnId: string, shiftKey?: boolean) => void;
  align?: 'left' | 'center' | 'right';
}

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const LabelContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
});

const SortIndicatorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginLeft: theme.spacing(0.5),
}));

const SortPriorityBadge = styled(Box)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: theme.typography.fontWeightBold,
  marginLeft: theme.spacing(0.5),
  padding: theme.spacing(0.25, 0.5),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  minWidth: '16px',
  textAlign: 'center',
}));

export function SortableColumnHeader({
  columnId,
  label,
  sortable = true,
  sortState = [],
  onSort,
  align = 'left',
}: SortableColumnHeaderProps) {
  const columnSort = sortState.find((s) => s.columnId === columnId);
  const sortDirection = columnSort?.direction || null;
  const sortPriority = columnSort?.priority;
  const isMultiSort = sortState.length > 1;

  const handleClick = (event: React.MouseEvent) => {
    if (!sortable || !onSort) return;
    
    event.stopPropagation();
    onSort(columnId, event.shiftKey);
  };

  const renderSortIcon = () => {
    if (!sortable) return null;

    if (sortDirection === 'asc') {
      return (
        <SortIndicatorContainer>
          <ArrowUpwardIcon fontSize="small" color="primary" />
          {isMultiSort && sortPriority !== undefined && (
            <SortPriorityBadge>{sortPriority + 1}</SortPriorityBadge>
          )}
        </SortIndicatorContainer>
      );
    }
    
    if (sortDirection === 'desc') {
      return (
        <SortIndicatorContainer>
          <ArrowDownwardIcon fontSize="small" color="primary" />
          {isMultiSort && sortPriority !== undefined && (
            <SortPriorityBadge>{sortPriority + 1}</SortPriorityBadge>
          )}
        </SortIndicatorContainer>
      );
    }
    
    return (
      <SortIndicatorContainer sx={{ opacity: 0.3 }}>
        <SwapVertIcon fontSize="small" />
      </SortIndicatorContainer>
    );
  };

  return (
    <HeaderContainer
      onClick={handleClick}
      sx={{
        justifyContent: align === 'center' ? 'center' : 
                       align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <LabelContainer
        sx={{
          justifyContent: align === 'center' ? 'center' : 
                         align === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        {label}
        {renderSortIcon()}
      </LabelContainer>
    </HeaderContainer>
  );
}

// Sort utility functions
export function sortData<T>(
  data: T[],
  sortState: SortState[],
  getValueFn?: (item: T, columnId: string) => any
): T[] {
  if (sortState.length === 0) return data;

  const sorted = [...data];
  
  sorted.sort((a, b) => {
    for (const sort of sortState) {
      const getValue = getValueFn || ((item: any, col: string) => item[col]);
      const aValue = getValue(a, sort.columnId);
      const bValue = getValue(b, sort.columnId);
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) continue;
      if (aValue == null) return sort.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sort.direction === 'asc' ? -1 : 1;
      
      // Compare values
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
  
  return sorted;
}

export function updateSortState(
  currentState: SortState[],
  columnId: string,
  multiSort: boolean = false
): SortState[] {
  const existingIndex = currentState.findIndex((s) => s.columnId === columnId);
  
  if (!multiSort) {
    // Single column sort
    if (existingIndex >= 0) {
      const current = currentState[existingIndex];
      if (current.direction === 'asc') {
        return [{ columnId, direction: 'desc', priority: 0 }];
      } else if (current.direction === 'desc') {
        return [];
      }
    }
    return [{ columnId, direction: 'asc', priority: 0 }];
  }
  
  // Multi-column sort
  const newState = [...currentState];
  
  if (existingIndex >= 0) {
    const current = newState[existingIndex];
    if (current.direction === 'asc') {
      newState[existingIndex] = { ...current, direction: 'desc' };
    } else {
      // Remove from sort
      newState.splice(existingIndex, 1);
      // Update priorities
      newState.forEach((s, i) => {
        s.priority = i;
      });
    }
  } else {
    // Add new sort
    newState.push({
      columnId,
      direction: 'asc',
      priority: newState.length,
    });
  }
  
  return newState;
}
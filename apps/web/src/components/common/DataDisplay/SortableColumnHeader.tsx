import React from 'react';
import { Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { styled } from '@mui/material/styles';
import { SortState, sortData, updateSortState } from '../../../utils/sortUtils';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortableColumnHeaderProps {
  columnId: string;
  label: string;
  sortable?: boolean;
  sortState?: SortState[];
  onSort?: (_columnId: string, _shiftKey?: boolean) => void;
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
  const columnSort = sortState.find(s => s.columnId === columnId);
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
          <ArrowUpwardIcon fontSize='small' color='primary' />
          {isMultiSort && sortPriority !== undefined && (
            <SortPriorityBadge>{sortPriority + 1}</SortPriorityBadge>
          )}
        </SortIndicatorContainer>
      );
    }

    if (sortDirection === 'desc') {
      return (
        <SortIndicatorContainer>
          <ArrowDownwardIcon fontSize='small' color='primary' />
          {isMultiSort && sortPriority !== undefined && (
            <SortPriorityBadge>{sortPriority + 1}</SortPriorityBadge>
          )}
        </SortIndicatorContainer>
      );
    }

    return (
      <SortIndicatorContainer sx={{ opacity: 0.3 }}>
        <SwapVertIcon fontSize='small' />
      </SortIndicatorContainer>
    );
  };

  return (
    <HeaderContainer
      onClick={handleClick}
      sx={{
        justifyContent:
          align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <LabelContainer
        sx={{
          justifyContent:
            align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        {label}
        {renderSortIcon()}
      </LabelContainer>
    </HeaderContainer>
  );
}

// Re-export sort utilities for external consumers
export { sortData, updateSortState };

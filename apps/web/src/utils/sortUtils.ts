export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export function sortData<T = Record<string, unknown>>(
  data: T[],
  sortState: SortState[],
  getValueFn?: (_item: T, _columnId: string) => unknown
): T[] {
  if (sortState.length === 0) return data;

  const sortedData = [...data];
  // Precompute sorted criteria to avoid mutation and re-sorting on each comparison
  const criteria = [...sortState].sort((a, b) => a.priority - b.priority);

  sortedData.sort((a, b) => {
    for (const sort of criteria) {
      const aValue = getValueFn
        ? getValueFn(a, sort.columnId)
        : (a as Record<string, unknown>)[sort.columnId];
      const bValue = getValueFn
        ? getValueFn(b, sort.columnId)
        : (b as Record<string, unknown>)[sort.columnId];

      let comparison = 0;

      // Handle null/undefined values
      if (aValue == null && bValue == null) {
        continue;
      }
      if (aValue == null) {
        comparison = -1;
      } else if (bValue == null) {
        comparison = 1;
      } else {
        // Try numeric comparison first
        const aNum = Number(aValue);
        const bNum = Number(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          // Fallback to string comparison
          const aStr = String(aValue).toLowerCase();
          const bStr = String(bValue).toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }
      }

      if (comparison !== 0) {
        return sort.direction === 'desc' ? -comparison : comparison;
      }
    }

    return 0;
  });

  return sortedData;
}

export function updateSortState(
  currentSort: SortState[],
  columnId: string,
  multiSort = false
): SortState[] {
  const existingSort = currentSort.find(s => s.columnId === columnId);

  if (!multiSort) {
    // Single sort mode
    if (existingSort) {
      if (existingSort.direction === 'asc') {
        return [{ columnId, direction: 'desc', priority: 0 }];
      } else {
        return []; // Remove sort
      }
    } else {
      return [{ columnId, direction: 'asc', priority: 0 }];
    }
  } else {
    // Multi sort mode
    if (existingSort) {
      if (existingSort.direction === 'asc') {
        // Change to desc
        return currentSort.map(s =>
          s.columnId === columnId ? { ...s, direction: 'desc' as const } : s
        );
      } else {
        // Remove this sort and re-sequence priorities to avoid gaps
        const filtered = currentSort.filter(s => s.columnId !== columnId);
        // Re-sequence priorities to be consecutive starting at 0
        return filtered
          .sort((a, b) => a.priority - b.priority)
          .map((s, index) => ({ ...s, priority: index }));
      }
    } else {
      // Add new sort
      const newPriority = Math.max(...currentSort.map(s => s.priority), -1) + 1;
      return [...currentSort, { columnId, direction: 'asc', priority: newPriority }];
    }
  }
}

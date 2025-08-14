import { FilterValue } from '../components/common/DataDisplay/ColumnFilter';

export function filterData<T = Record<string, unknown>>(
  data: T[],
  filters: FilterValue[],
  getValueFn?: (_item: T, _columnId: string) => unknown
): T[] {
  if (filters.length === 0) return data;

  return data.filter(item => {
    return filters.every(filter => {
      const value = getValueFn
        ? getValueFn(item, filter.columnId)
        : (item as Record<string, unknown>)[filter.columnId];

      if (filter.value === null || filter.value === undefined || filter.value === '') {
        return true;
      }

      const stringValue = String(value).toLowerCase();
      const filterValue = String(filter.value).toLowerCase();

      switch (filter.type) {
        case 'text':
          switch (filter.operator) {
            case 'contains':
              return stringValue.includes(filterValue);
            case 'equals':
              return stringValue === filterValue;
            case 'startsWith':
              return stringValue.startsWith(filterValue);
            case 'endsWith':
              return stringValue.endsWith(filterValue);
            default:
              return true;
          }

        case 'number': {
          const numValue = Number(value);
          const numFilter = Number(filter.value);

          if (isNaN(numValue) || isNaN(numFilter)) return false;

          switch (filter.operator) {
            case 'equals':
              return numValue === numFilter;
            case 'greaterThan':
              return numValue > numFilter;
            case 'lessThan':
              return numValue < numFilter;
            case 'greaterThanOrEqual':
              return numValue >= numFilter;
            case 'lessThanOrEqual':
              return numValue <= numFilter;
            case 'between': {
              const numFilter2 = Number(filter.value2);
              if (isNaN(numFilter2)) return false;
              return numValue >= numFilter && numValue <= numFilter2;
            }
            default:
              return true;
          }
        }

        case 'date': {
          const dateValue = new Date(value as string);
          const filterDate = new Date(filter.value as string);

          if (isNaN(dateValue.getTime()) || isNaN(filterDate.getTime())) return false;

          switch (filter.operator) {
            case 'equals':
              return dateValue.toDateString() === filterDate.toDateString();
            case 'greaterThan':
              return dateValue > filterDate;
            case 'lessThan':
              return dateValue < filterDate;
            case 'greaterThanOrEqual':
              return dateValue >= filterDate;
            case 'lessThanOrEqual':
              return dateValue <= filterDate;
            case 'between': {
              const filterDate2 = new Date(filter.value2 as string);
              if (isNaN(filterDate2.getTime())) return false;
              return dateValue >= filterDate && dateValue <= filterDate2;
            }
            default:
              return true;
          }
        }

        case 'select':
          return stringValue === filterValue;

        default:
          return true;
      }
    });
  });
}

export function getActiveFilterCount(filters: FilterValue[]): number {
  return filters.filter(filter => {
    if (filter.type === 'number' && filter.operator === 'between') {
      return (
        filter.value !== null &&
        filter.value !== undefined &&
        filter.value2 !== null &&
        filter.value2 !== undefined
      );
    }
    return filter.value !== null && filter.value !== undefined && filter.value !== '';
  }).length;
}

export function getFilterSummary(filter: FilterValue): string {
  if (filter.type === 'text') {
    switch (filter.operator) {
      case 'contains':
        return `∋ ${filter.value}`;
      case 'equals':
        return `= ${filter.value}`;
      case 'startsWith':
        return `^${filter.value}`;
      case 'endsWith':
        return `${filter.value}$`;
      default:
        return String(filter.value);
    }
  }

  if (filter.type === 'number') {
    switch (filter.operator) {
      case 'equals':
        return `= ${filter.value}`;
      case 'greaterThan':
        return `> ${filter.value}`;
      case 'lessThan':
        return `< ${filter.value}`;
      case 'greaterThanOrEqual':
        return `≥ ${filter.value}`;
      case 'lessThanOrEqual':
        return `≤ ${filter.value}`;
      case 'between':
        return `${filter.value} ↔ ${filter.value2}`;
      default:
        return String(filter.value);
    }
  }

  if (filter.type === 'date') {
    const formatDate = (date: unknown) => {
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      return String(date);
    };

    switch (filter.operator) {
      case 'equals':
        return `= ${formatDate(filter.value)}`;
      case 'greaterThan':
        return `> ${formatDate(filter.value)}`;
      case 'lessThan':
        return `< ${formatDate(filter.value)}`;
      case 'greaterThanOrEqual':
        return `≥ ${formatDate(filter.value)}`;
      case 'lessThanOrEqual':
        return `≤ ${formatDate(filter.value)}`;
      case 'between':
        return `${formatDate(filter.value)} ↔ ${formatDate(filter.value2)}`;
      default:
        return formatDate(filter.value);
    }
  }

  return String(filter.value);
}

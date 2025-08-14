export interface ColumnConfig {
  id: string;
  width: number;
  order: number;
}

export function getDefaultColumnConfig(columns: { id: string; width?: number }[]): ColumnConfig[] {
  return columns.map((col, index) => ({
    id: col.id,
    width: col.width || 150,
    order: index,
  }));
}

// Type guard function for filtering out null values
function isConfiguredColumn<T extends { id: string }>(
  item: (T & { width: number; order: number }) | null
): item is T & { width: number; order: number } {
  return item !== null;
}

export function applyColumnConfig<T extends { id: string }>(
  columns: T[],
  config: ColumnConfig[]
): Array<T & { width: number; order: number }> {
  const configMap = new Map(config.map(c => [c.id, c]));

  return columns
    .map((col): (T & { width: number; order: number }) | null => {
      const cfg = configMap.get(col.id);
      if (!cfg) return null;
      return {
        ...col,
        width: cfg.width,
        order: cfg.order,
      };
    })
    .filter(isConfiguredColumn)
    .sort((a, b) => a.order - b.order);
}

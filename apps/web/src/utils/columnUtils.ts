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

export function applyColumnConfig(columns: unknown[], config: ColumnConfig[]): unknown[] {
  const configMap = new Map(config.map(c => [c.id, c]));

  return columns
    .map(col => {
      const cfg = configMap.get((col as { id: string }).id);
      if (!cfg) return null;
      return {
        ...(col as Record<string, unknown>),
        width: cfg.width,
        order: cfg.order,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a as { order: number }).order - (b as { order: number }).order);
}

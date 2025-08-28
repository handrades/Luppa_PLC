export interface DashboardOverview {
  totalEquipment: number;
  totalPLCs: number;
  totalSites: number;
  totalCells: number;
  weeklyTrend: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  lastUpdated: Date;
}

export interface DistributionData {
  labels: string[];
  values: number[];
  percentages: number[];
  colors: string[];
}

export interface TopModel {
  make: string;
  model: string;
  count: number;
  percentage: number;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'site' | 'cell' | 'equipment';
  count: number;
  children?: HierarchyNode[];
}

export interface RecentActivity {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'plc' | 'equipment' | 'cell' | 'site';
  entityName: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface AnalyticsFilters {
  siteIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  page?: number;
}

export interface ExportOptions {
  format: 'pdf';
  sections: string[];
  includeTimestamp: boolean;
}

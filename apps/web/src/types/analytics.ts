export interface DashboardOverview {
  totalEquipment: number;
  totalPLCs: number;
  totalSites: number;
  totalCells: number;
  weeklyTrend: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  lastUpdated: Date | string;
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
  timestamp: Date | string;
  details?: Record<string, unknown>;
}

export interface AnalyticsExportOptions {
  format: 'pdf';
  sections: ('overview' | 'distribution' | 'topModels' | 'hierarchy' | 'activity')[];
  includeTimestamp?: boolean;
}

export interface AnalyticsExportData {
  overview?: DashboardOverview;
  distribution?: {
    site: DistributionData;
    make: DistributionData;
    type: DistributionData;
  };
  topModels?: TopModel[];
  hierarchy?: HierarchyNode[];
  activity?: RecentActivity[];
  metadata?: {
    generatedAt: Date | string;
    generatedBy: string;
    format: string;
  };
}

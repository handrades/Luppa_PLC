// Import Equipment and Cell types from existing modules
import type { EquipmentType } from './equipment';

// Define CellType union matching backend values
export type CellType =
  | 'Assembly Line'
  | 'Production Cell'
  | 'Testing Station'
  | 'Packaging Line'
  | 'Quality Control'
  | 'Storage'
  | 'Material Handling'
  | 'Maintenance Shop';

export interface ImportOptions {
  createMissing: boolean;
  mergeStrategy: 'skip' | 'update' | 'replace';
  validateOnly: boolean;
}

export interface ValidationError {
  row: number;
  column: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  importId: string;
  duration: number;
}

export interface ImportPreview {
  headers: string[];
  rows: string[][];
  validationErrors: ValidationError[];
  totalRows: number;
  previewRows: number;
}

export interface ExportFilters {
  siteIds?: string[];
  cellIds?: string[];
  equipmentIds?: string[];
  cellTypes?: CellType[];
  equipmentTypes?: EquipmentType[];
  dateRange?: {
    start: string | Date;
    end: string | Date;
  };
  ipRange?: string;
  tags?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeHierarchy: boolean;
  includeTags: boolean;
  includeAuditInfo: boolean;
}

export interface ImportLog {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errors: ValidationError[];
  userId: string;
  startedAt: string | Date;
  completedAt?: string | Date;
  duration?: number;
  rollbackAvailable: boolean;
}

export interface ImportRollback {
  id: string;
  importId: string;
  userId: string;
  rollbackAt: string | Date;
  affectedRecords: number;
  status: 'success' | 'failed';
  error?: string;
}

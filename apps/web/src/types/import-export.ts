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
  cellTypes?: string[];
  equipmentTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
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
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  rollbackAvailable: boolean;
}

export interface ImportRollback {
  id: string;
  importId: string;
  userId: string;
  rollbackAt: Date;
  affectedRecords: number;
  status: 'success' | 'failed';
  error?: string;
}

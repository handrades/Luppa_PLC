export interface ImportOptions {
  createMissing: boolean; // Auto-create missing hierarchy entities
  mergeStrategy: 'skip' | 'update' | 'replace';
  validateOnly: boolean;
  userId: string;
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
  ipRange?: string; // CIDR notation
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

export interface CSVRow {
  site_name: string;
  cell_name: string;
  cell_type?: string;
  equipment_name: string;
  equipment_type?: string;
  tag_id: string;
  description: string;
  make: string;
  model: string;
  ip_address?: string;
  firmware_version?: string;
  tags?: string;
}

export interface ProcessedRow extends CSVRow {
  rowNumber: number;
  siteId?: string;
  cellId?: string;
  equipmentId?: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface BulkImportJob {
  id: string;
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  errors: ValidationError[];
  createdAt: Date;
  updatedAt: Date;
}

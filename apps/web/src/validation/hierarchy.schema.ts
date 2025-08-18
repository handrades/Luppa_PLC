/**
 * Hierarchy Validation Schemas
 * Comprehensive Zod schemas for site hierarchy validation
 * Story 4.5: Site Hierarchy Management
 */

import { z } from 'zod';
import { hierarchyService } from '../services/hierarchy.service';

/**
 * Site name validation regex
 * Allows alphanumeric characters, spaces, hyphens, and underscores
 */
const SITE_NAME_REGEX = /^[a-zA-Z0-9\s\-_]+$/;

/**
 * Cell line number validation regex
 * Allows uppercase letters, numbers, and hyphens (e.g., LINE-01, CELL-A)
 */
const LINE_NUMBER_REGEX = /^[A-Z0-9-]+$/;

/**
 * Equipment name validation regex
 * Allows alphanumeric characters, spaces, hyphens, and underscores
 */
const EQUIPMENT_NAME_REGEX = /^[a-zA-Z0-9\s\-_]+$/;

/**
 * Base site validation schema
 */
export const siteSchema = z.object({
  name: z
    .string()
    .min(1, 'Site name is required')
    .max(100, 'Site name must be less than 100 characters')
    .regex(SITE_NAME_REGEX, 'Site name contains invalid characters')
    .transform(name => name.trim()),
});

/**
 * Site creation schema with uniqueness validation
 */
export const createSiteSchema = siteSchema.extend({
  name: siteSchema.shape.name.refine(
    async name => {
      try {
        return await hierarchyService.validateSiteUniqueness(name);
      } catch (error) {
        // If validation service fails, allow the value to pass client validation
        // Server validation will catch any issues
        return true;
      }
    },
    {
      message: 'Site name already exists',
    }
  ),
});

/**
 * Site update schema with uniqueness validation (excluding current site)
 */
export const updateSiteSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Site name is required')
      .max(100, 'Site name must be less than 100 characters')
      .regex(SITE_NAME_REGEX, 'Site name contains invalid characters')
      .transform(name => name.trim()),
    updatedAt: z
      .string()
      .min(1, 'Updated timestamp is required for updates')
      .datetime('Invalid timestamp format'),
    excludeId: z.string().uuid().optional(),
  })
  .refine(
    async data => {
      try {
        return await hierarchyService.validateSiteUniqueness(data.name, data.excludeId);
      } catch (error) {
        return true;
      }
    },
    {
      message: 'Site name already exists',
      path: ['name'],
    }
  );

/**
 * Base cell validation schema
 */
export const cellSchema = z.object({
  siteId: z.string().uuid('Invalid site ID').min(1, 'Site selection is required'),
  name: z
    .string()
    .min(1, 'Cell name is required')
    .max(100, 'Cell name must be less than 100 characters')
    .regex(EQUIPMENT_NAME_REGEX, 'Cell name contains invalid characters')
    .transform(name => name.trim()),
  lineNumber: z
    .string()
    .min(1, 'Line number is required')
    .max(50, 'Line number must be less than 50 characters')
    .regex(LINE_NUMBER_REGEX, 'Line number must be uppercase alphanumeric with hyphens only')
    .transform(lineNumber => lineNumber.toUpperCase().trim()),
});

/**
 * Cell creation schema with uniqueness validation
 */
export const createCellSchema = cellSchema.refine(
  async data => {
    try {
      return await hierarchyService.validateCellUniqueness(data.siteId, data.lineNumber);
    } catch (error) {
      return true;
    }
  },
  {
    message: 'Line number already exists in this site',
    path: ['lineNumber'],
  }
);

/**
 * Cell update schema with uniqueness validation (excluding current cell)
 */
export const updateCellSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Cell name is required')
      .max(100, 'Cell name must be less than 100 characters')
      .regex(EQUIPMENT_NAME_REGEX, 'Cell name contains invalid characters')
      .transform(name => name.trim()),
    lineNumber: z
      .string()
      .min(1, 'Line number is required')
      .max(50, 'Line number must be less than 50 characters')
      .regex(LINE_NUMBER_REGEX, 'Line number must be uppercase alphanumeric with hyphens only')
      .transform(lineNumber => lineNumber.toUpperCase().trim()),
    updatedAt: z
      .string()
      .min(1, 'Updated timestamp is required for updates')
      .datetime('Invalid timestamp format'),
    siteId: z.string().uuid().optional(),
    excludeId: z.string().uuid().optional(),
  })
  .refine(
    async data => {
      if (!data.siteId) return true; // Skip validation if no site ID
      try {
        return await hierarchyService.validateCellUniqueness(
          data.siteId,
          data.lineNumber,
          data.excludeId
        );
      } catch (error) {
        return true;
      }
    },
    {
      message: 'Line number already exists in this site',
      path: ['lineNumber'],
    }
  );

/**
 * Hierarchy location validation schema
 * Validates that a site and cell combination is valid
 */
export const hierarchyLocationSchema = z
  .object({
    siteId: z.string().uuid('Invalid site ID').min(1, 'Site selection is required'),
    cellId: z.string().uuid('Invalid cell ID').min(1, 'Cell selection is required'),
  })
  .refine(
    async data => {
      try {
        // Validate that the cell belongs to the selected site
        const cell = await hierarchyService.getCellById(data.cellId);
        return cell.siteId === data.siteId;
      } catch (error) {
        return false;
      }
    },
    {
      message: 'Selected cell does not belong to the selected site',
      path: ['cellId'],
    }
  );

/**
 * Bulk operation validation schema
 */
export const bulkOperationSchema = z.object({
  operation: z.enum(['delete', 'move', 'update', 'export'], {
    errorMap: () => ({ message: 'Invalid operation type' }),
  }),
  entityType: z.enum(['site', 'cell', 'equipment'], {
    errorMap: () => ({ message: 'Invalid entity type' }),
  }),
  entityIds: z
    .array(z.string().uuid('Invalid entity ID'))
    .min(1, 'At least one entity must be selected')
    .max(100, 'Too many entities selected for bulk operation'),
  params: z.record(z.unknown()).optional(),
});

/**
 * Site search filters validation schema
 */
export const siteFiltersSchema = z.object({
  search: z.string().max(100, 'Search query too long').optional(),
  includeEmpty: z.boolean().optional(),
  page: z.number().int().min(1, 'Page must be at least 1').optional(),
  pageSize: z.number().int().min(1).max(100, 'Page size must be between 1 and 100').optional(),
  sortBy: z.enum(['name', 'createdAt', 'cellCount', 'equipmentCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Cell search filters validation schema
 */
export const cellFiltersSchema = z.object({
  siteId: z.string().uuid('Invalid site ID').optional(),
  search: z.string().max(100, 'Search query too long').optional(),
  includeEmpty: z.boolean().optional(),
  page: z.number().int().min(1, 'Page must be at least 1').optional(),
  pageSize: z.number().int().min(1).max(100, 'Page size must be between 1 and 100').optional(),
  sortBy: z.enum(['name', 'lineNumber', 'createdAt', 'equipmentCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * Hierarchy tree filters validation schema
 */
export const hierarchyTreeFiltersSchema = z.object({
  expandLevel: z.number().int().min(0).max(3, 'Expand level must be between 0 and 3').optional(),
  siteId: z.string().uuid('Invalid site ID').optional(),
  cellId: z.string().uuid('Invalid cell ID').optional(),
  search: z.string().max(100, 'Search query too long').optional(),
  includeEmpty: z.boolean().optional(),
  includeCounts: z.boolean().optional(),
});

/**
 * Import validation schema
 */
export const importSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx'], {
    errorMap: () => ({ message: 'Invalid import format' }),
  }),
  validateOnly: z.boolean().optional(),
  skipDuplicates: z.boolean().optional(),
});

/**
 * Export validation schema
 */
export const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx'], {
    errorMap: () => ({ message: 'Invalid export format' }),
  }),
  siteIds: z.array(z.string().uuid()).optional(),
  includeEquipment: z.boolean().optional(),
  includePlcs: z.boolean().optional(),
});

/**
 * Validation utility functions
 */

/**
 * Validate site name uniqueness
 */
export async function validateSiteUniqueness(name: string, excludeId?: string): Promise<boolean> {
  if (!name.trim()) return false;

  try {
    return await hierarchyService.validateSiteUniqueness(name.trim(), excludeId);
  } catch (error) {
    // Site uniqueness validation failed
    return false;
  }
}

/**
 * Validate cell line number uniqueness within site
 */
export async function validateCellUniqueness(
  siteId: string,
  lineNumber: string,
  excludeId?: string
): Promise<boolean> {
  if (!siteId || !lineNumber.trim()) return false;

  try {
    return await hierarchyService.validateCellUniqueness(
      siteId,
      lineNumber.trim().toUpperCase(),
      excludeId
    );
  } catch (error) {
    // Cell uniqueness validation failed
    return false;
  }
}

/**
 * Validate that a cell belongs to a site
 */
export async function validateCellBelongsToSite(cellId: string, siteId: string): Promise<boolean> {
  if (!cellId || !siteId) return false;

  try {
    const cell = await hierarchyService.getCellById(cellId);
    return cell.siteId === siteId;
  } catch (error) {
    // Cell-site relationship validation failed
    return false;
  }
}

/**
 * Validate hierarchy integrity
 */
export async function validateHierarchyIntegrity(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    const result = await hierarchyService.validateHierarchy({
      checkOrphans: true,
      checkConstraints: true,
      checkCounts: true,
    });

    return {
      isValid: result.isValid,
      errors: result.errors.map(error => error.message),
      warnings: result.warnings.map(warning => warning.message),
    };
  } catch (error) {
    // Hierarchy integrity validation failed
    return {
      isValid: false,
      errors: ['Failed to validate hierarchy integrity'],
      warnings: [],
    };
  }
}

/**
 * Check for orphaned records
 */
export async function checkForOrphanedRecords(): Promise<{
  hasOrphans: boolean;
  orphanedCells: string[];
  orphanedEquipment: string[];
}> {
  try {
    const orphans = await hierarchyService.detectOrphanedRecords();

    const orphanedCells = orphans
      .filter(orphan => orphan.type === 'cell')
      .map(orphan => orphan.name);

    const orphanedEquipment = orphans
      .filter(orphan => orphan.type === 'equipment')
      .map(orphan => orphan.name);

    return {
      hasOrphans: orphans.length > 0,
      orphanedCells,
      orphanedEquipment,
    };
  } catch (error) {
    // Orphaned records check failed
    return {
      hasOrphans: false,
      orphanedCells: [],
      orphanedEquipment: [],
    };
  }
}

/**
 * Validate site name format (synchronous)
 */
export function validateSiteNameFormat(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Site name is required' };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Site name must be less than 100 characters',
    };
  }

  if (!SITE_NAME_REGEX.test(name)) {
    return { isValid: false, error: 'Site name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validate cell line number format (synchronous)
 */
export function validateLineNumberFormat(lineNumber: string): {
  isValid: boolean;
  error?: string;
} {
  if (!lineNumber || !lineNumber.trim()) {
    return { isValid: false, error: 'Line number is required' };
  }

  if (lineNumber.length > 50) {
    return {
      isValid: false,
      error: 'Line number must be less than 50 characters',
    };
  }

  const upperLineNumber = lineNumber.toUpperCase();
  if (!LINE_NUMBER_REGEX.test(upperLineNumber)) {
    return {
      isValid: false,
      error: 'Line number must be uppercase alphanumeric with hyphens only',
    };
  }

  return { isValid: true };
}

/**
 * Validate cell name format (synchronous)
 */
export function validateCellNameFormat(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Cell name is required' };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Cell name must be less than 100 characters',
    };
  }

  if (!EQUIPMENT_NAME_REGEX.test(name)) {
    return { isValid: false, error: 'Cell name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Custom validation error class
 */
export class HierarchyValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HierarchyValidationError';
  }
}

/**
 * Validation middleware for forms
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { isValid: boolean; error?: string; data?: T } {
  try {
    const data = schema.parse(value);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        isValid: false,
        error: firstError.message,
      };
    }
    return {
      isValid: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Async validation middleware for forms
 */
export async function validateFieldAsync<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): Promise<{ isValid: boolean; error?: string; data?: T }> {
  try {
    const data = await schema.parseAsync(value);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        isValid: false,
        error: firstError.message,
      };
    }
    return {
      isValid: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Type exports for schema inference
 */
export type SiteData = z.infer<typeof siteSchema>;
export type CreateSiteData = z.infer<typeof createSiteSchema>;
export type UpdateSiteData = z.infer<typeof updateSiteSchema>;
export type CellData = z.infer<typeof cellSchema>;
export type CreateCellData = z.infer<typeof createCellSchema>;
export type UpdateCellData = z.infer<typeof updateCellSchema>;
export type HierarchyLocationData = z.infer<typeof hierarchyLocationSchema>;
export type BulkOperationData = z.infer<typeof bulkOperationSchema>;
export type SiteFiltersData = z.infer<typeof siteFiltersSchema>;
export type CellFiltersData = z.infer<typeof cellFiltersSchema>;
export type HierarchyTreeFiltersData = z.infer<typeof hierarchyTreeFiltersSchema>;
export type ImportData = z.infer<typeof importSchema>;
export type ExportData = z.infer<typeof exportSchema>;

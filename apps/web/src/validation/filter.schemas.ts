/**
 * Advanced Filter Validation Schemas
 * Story 5.1: Advanced Filtering System
 *
 * Comprehensive Zod validation schemas for all filter types including
 * date ranges, IP addresses, tags, and complex filter combinations.
 */

import { z } from 'zod';
import { EquipmentType } from '../types/equipment';
import type {
  AdvancedFilters,
  CreateFilterPresetRequest,
  FilterPreset,
  IPRangeFilter,
  TagFilter,
  UpdateFilterPresetRequest,
} from '../types/advanced-filters';

// =============================================================================
// UTILITY VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates IPv4 address format
 */
const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
};

/**
 * Validates CIDR notation format
 */
const isValidCIDR = (cidr: string): boolean => {
  const cidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidr);
};

/**
 * Validates that start IP is less than end IP
 */
const isValidIPRange = (startIP: string, endIP: string): boolean => {
  if (!isValidIPv4(startIP) || !isValidIPv4(endIP)) {
    return false;
  }

  const startParts = startIP.split('.').map(Number);
  const endParts = endIP.split('.').map(Number);

  for (let i = 0; i < 4; i++) {
    if (startParts[i] < endParts[i]) return true;
    if (startParts[i] > endParts[i]) return false;
  }

  return true; // Equal IPs are valid (single IP range)
};

/**
 * Validates tag name format
 */
const isValidTagName = (tag: string): boolean => {
  // Tags should be alphanumeric with hyphens, underscores, and spaces
  const tagRegex = /^[a-zA-Z0-9\s\-_]+$/;
  return tagRegex.test(tag) && tag.trim().length > 0;
};

// =============================================================================
// BASIC TYPE SCHEMAS
// =============================================================================

/**
 * UUID validation schema
 */
const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Non-empty string schema with length limits
 */
const nonEmptyStringSchema = (maxLength = 100) =>
  z
    .string()
    .min(1, 'Value cannot be empty')
    .max(maxLength, `Value must be less than ${maxLength} characters`)
    .trim();

/**
 * Date schema that accepts Date objects or ISO strings
 */
const dateSchema = z
  .union([z.date(), z.string().datetime({ message: 'Invalid date format. Use ISO 8601 format.' })])
  .transform(val => (typeof val === 'string' ? new Date(val) : val));

/**
 * Equipment type enum schema
 */
const equipmentTypeSchema = z.nativeEnum(EquipmentType);

// =============================================================================
// IP ADDRESS VALIDATION SCHEMAS
// =============================================================================

/**
 * IPv4 address validation schema
 */
const ipv4Schema = z.string().refine(isValidIPv4, 'Invalid IPv4 address format');

/**
 * CIDR notation validation schema
 */
const cidrSchema = z
  .string()
  .refine(isValidCIDR, 'Invalid CIDR notation format (e.g., 192.168.1.0/24)');

/**
 * IP range filter validation schema
 */
const ipRangeFilterSchema: z.ZodType<IPRangeFilter> = z
  .object({
    cidr: cidrSchema.optional(),
    startIP: ipv4Schema.optional(),
    endIP: ipv4Schema.optional(),
  })
  .refine(
    data => {
      // At least one field must be provided
      return data.cidr || (data.startIP && data.endIP);
    },
    {
      message: 'Either CIDR notation or both start and end IP addresses must be provided',
    }
  )
  .refine(
    data => {
      // If both start and end IP are provided, validate the range
      if (data.startIP && data.endIP) {
        return isValidIPRange(data.startIP, data.endIP);
      }
      return true;
    },
    {
      message: 'Start IP address must be less than or equal to end IP address',
    }
  );

// =============================================================================
// TAG FILTER VALIDATION SCHEMAS
// =============================================================================

/**
 * Individual tag validation schema
 */
const tagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(50, 'Tag must be less than 50 characters')
  .refine(
    isValidTagName,
    'Tag contains invalid characters. Use alphanumeric, spaces, hyphens, and underscores only'
  );

/**
 * Tag array validation schema
 */
const tagArraySchema = z.array(tagSchema).max(100, 'Maximum 100 tags allowed');

/**
 * Tag filter validation schema
 */
const tagFilterSchema: z.ZodType<TagFilter> = z
  .object({
    include: tagArraySchema.optional(),
    exclude: tagArraySchema.optional(),
    logic: z.enum(['AND', 'OR']).default('AND'),
  })
  .refine(
    data => {
      // At least include or exclude must be provided
      return data.include?.length || data.exclude?.length;
    },
    {
      message: 'At least one include or exclude tag must be provided',
    }
  )
  .refine(
    data => {
      // Check for overlapping tags between include and exclude
      if (data.include && data.exclude) {
        const includeSet = new Set(data.include);
        const hasOverlap = data.exclude.some(tag => includeSet.has(tag));
        return !hasOverlap;
      }
      return true;
    },
    {
      message: 'Tags cannot appear in both include and exclude lists',
    }
  );

// =============================================================================
// DATE RANGE VALIDATION SCHEMAS
// =============================================================================

/**
 * Date range validation helper
 */
const validateDateRange = (startDate?: Date, endDate?: Date): boolean => {
  if (!startDate || !endDate) return true;
  return startDate <= endDate;
};

/**
 * Business logic for date ranges
 */
const validateBusinessDateRules = (filters: Partial<AdvancedFilters>): boolean => {
  // Created date cannot be after updated date
  if (filters.createdAfter && filters.updatedBefore) {
    return filters.createdAfter <= filters.updatedBefore;
  }

  // Updated date cannot be before created date
  if (filters.updatedAfter && filters.createdBefore) {
    return filters.updatedAfter >= filters.createdBefore;
  }

  return true;
};

// =============================================================================
// PERFORMANCE VALIDATION
// =============================================================================

/**
 * Performance validation for complex filters
 */
const validateFilterPerformance = (
  filters: AdvancedFilters
): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  let complexityScore = 0;

  // Check for potentially expensive operations
  if (filters.siteIds && filters.siteIds.length > 50) {
    warnings.push('Selecting more than 50 sites may impact performance');
    complexityScore += 2;
  }

  if (filters.equipmentTypes && filters.equipmentTypes.length > 10) {
    warnings.push('Selecting more than 10 equipment types may impact performance');
    complexityScore += 1;
  }

  if (filters.tagFilter?.include && filters.tagFilter.include.length > 20) {
    warnings.push('Including more than 20 tags may impact performance');
    complexityScore += 2;
  }

  if (filters.searchQuery && filters.searchQuery.length > 200) {
    warnings.push('Very long search queries may impact performance');
    complexityScore += 1;
  }

  // Check for date ranges that span more than 5 years
  if (filters.createdAfter && filters.createdBefore) {
    const yearsDiff =
      (filters.createdBefore.getTime() - filters.createdAfter.getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    if (yearsDiff > 5) {
      warnings.push('Date ranges spanning more than 5 years may impact performance');
      complexityScore += 2;
    }
  }

  // Overall complexity check
  if (complexityScore > 5) {
    warnings.push('This filter combination is very complex and may be slow');
  }

  return {
    isValid: complexityScore <= 10, // Hard limit to prevent extremely slow queries
    warnings,
  };
};

// =============================================================================
// MAIN FILTER SCHEMAS
// =============================================================================

/**
 * Advanced filters validation schema
 */
export const advancedFiltersSchema: z.ZodType<AdvancedFilters> = z
  .object({
    // Multi-select filters
    siteIds: z.array(uuidSchema).max(100, 'Maximum 100 sites allowed').optional(),
    cellTypes: z
      .array(nonEmptyStringSchema(50))
      .max(50, 'Maximum 50 cell types allowed')
      .optional(),
    equipmentTypes: z
      .array(equipmentTypeSchema)
      .max(20, 'Maximum 20 equipment types allowed')
      .optional(),
    makes: z.array(nonEmptyStringSchema(100)).max(50, 'Maximum 50 makes allowed').optional(),
    models: z.array(nonEmptyStringSchema(100)).max(100, 'Maximum 100 models allowed').optional(),

    // Date range filters
    createdAfter: dateSchema.optional(),
    createdBefore: dateSchema.optional(),
    updatedAfter: dateSchema.optional(),
    updatedBefore: dateSchema.optional(),

    // IP range filtering
    ipRange: ipRangeFilterSchema.optional(),

    // Tag filtering
    tagFilter: tagFilterSchema.optional(),

    // Text search
    searchQuery: z
      .string()
      .max(500, 'Search query must be less than 500 characters')
      .regex(/^[a-zA-Z0-9\s\-_.]*$/, 'Search query contains invalid characters')
      .optional(),
    searchFields: z
      .array(nonEmptyStringSchema(50))
      .max(20, 'Maximum 20 search fields allowed')
      .optional(),

    // Pagination and sorting
    page: z
      .number()
      .int()
      .min(1, 'Page must be at least 1')
      .max(10000, 'Page cannot exceed 10000')
      .optional(),
    pageSize: z
      .number()
      .int()
      .min(1, 'Page size must be at least 1')
      .max(1000, 'Page size cannot exceed 1000')
      .optional(),
    sortBy: nonEmptyStringSchema(50).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .refine(data => validateDateRange(data.createdAfter, data.createdBefore), {
    message: 'Created after date must be before created before date',
    path: ['createdBefore'],
  })
  .refine(data => validateDateRange(data.updatedAfter, data.updatedBefore), {
    message: 'Updated after date must be before updated before date',
    path: ['updatedBefore'],
  })
  .refine(data => validateBusinessDateRules(data), {
    message: 'Date ranges violate business logic constraints',
    path: ['updatedBefore'],
  })
  .refine(
    data => {
      const performance = validateFilterPerformance(data);
      return performance.isValid;
    },
    {
      message: 'Filter combination is too complex and may cause performance issues',
    }
  );

// =============================================================================
// FILTER PRESET VALIDATION SCHEMAS
// =============================================================================

/**
 * Filter preset name validation
 */
const presetNameSchema = z
  .string()
  .min(1, 'Preset name is required')
  .max(100, 'Preset name must be less than 100 characters')
  .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Preset name contains invalid characters')
  .transform(name => name.trim());

/**
 * Create filter preset validation schema
 */
export const createFilterPresetSchema: z.ZodType<CreateFilterPresetRequest> = z.object({
  name: presetNameSchema,
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(desc => desc?.trim()),
  filterConfig: advancedFiltersSchema,
  isDefault: z.boolean().optional().default(false),
  isShared: z.boolean().optional().default(false),
});

/**
 * Update filter preset validation schema
 */
export const updateFilterPresetSchema: z.ZodType<UpdateFilterPresetRequest> = z.object({
  name: presetNameSchema,
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(desc => desc?.trim()),
  filterConfig: advancedFiltersSchema,
  isDefault: z.boolean().optional().default(false),
  isShared: z.boolean().optional().default(false),
  updatedAt: z.string().datetime('Invalid timestamp format for optimistic locking'),
});

/**
 * Filter preset validation schema (for API responses)
 */
export const filterPresetSchema: z.ZodType<FilterPreset> = z.object({
  id: uuidSchema,
  name: presetNameSchema,
  description: z.string().optional(),
  filterConfig: advancedFiltersSchema,
  isDefault: z.boolean(),
  isShared: z.boolean(),
  sharedToken: z.string().optional(),
  usageCount: z.number().int().min(0),
  lastUsedAt: dateSchema.optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  createdBy: uuidSchema,
});

// =============================================================================
// URL PARAMETER VALIDATION
// =============================================================================

/**
 * URL parameter validation for shareable links
 */
export const filterURLParamsSchema = z
  .object({
    f: z.string().optional(), // Base64 encoded filters
    p: uuidSchema.optional(), // Preset ID
    page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform(val => (val ? parseInt(val) : undefined)),
    size: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform(val => (val ? parseInt(val) : undefined)),
    sort: nonEmptyStringSchema(50).optional(),
    dir: z.enum(['asc', 'desc']).optional(),
  })
  .refine(
    data => {
      // Either filters (f) or preset (p) should be provided, not both
      return !data.f || !data.p;
    },
    {
      message: 'Cannot specify both filter data and preset ID in URL',
    }
  );

// =============================================================================
// VALIDATION UTILITY FUNCTIONS
// =============================================================================

/**
 * Validates advanced filters and returns detailed validation result
 */
export const validateAdvancedFilters = (filters: unknown) => {
  const result = advancedFiltersSchema.safeParse(filters);

  if (result.success) {
    // Additional performance validation
    const performance = validateFilterPerformance(result.data);

    return {
      success: true,
      data: result.data,
      warnings: performance.warnings,
    };
  }

  return {
    success: false,
    error: result.error,
    fieldErrors: result.error.flatten().fieldErrors,
  };
};

/**
 * Validates filter preset data
 */
export const validateFilterPreset = (preset: unknown, isUpdate = false) => {
  const schema = isUpdate ? updateFilterPresetSchema : createFilterPresetSchema;
  return schema.safeParse(preset);
};

/**
 * Validates URL parameters for filter sharing
 */
export const validateFilterURLParams = (params: unknown) => {
  return filterURLParamsSchema.safeParse(params);
};

/**
 * Sanitizes filter input to prevent XSS and injection attacks
 */
export const sanitizeFilterInput = <T>(input: T): T => {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/[<>'"]/g, '').trim() as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeFilterInput(item)) as T;
  }

  if (input && typeof input === 'object') {
    const sanitized = {} as T;
    for (const [key, value] of Object.entries(input)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeFilterInput(value);
    }
    return sanitized;
  }

  return input;
};

/**
 * Checks if two filter configurations are equivalent
 */
export const areFiltersEqual = (filters1: AdvancedFilters, filters2: AdvancedFilters): boolean => {
  const normalized1 = JSON.stringify(filters1, Object.keys(filters1).sort());
  const normalized2 = JSON.stringify(filters2, Object.keys(filters2).sort());
  return normalized1 === normalized2;
};

/**
 * Calculates complexity score for a filter configuration
 */
export const calculateFilterComplexity = (filters: AdvancedFilters): number => {
  let score = 0;

  // Multi-select complexity
  score += (filters.siteIds?.length || 0) * 0.1;
  score += (filters.cellTypes?.length || 0) * 0.1;
  score += (filters.equipmentTypes?.length || 0) * 0.2;
  score += (filters.makes?.length || 0) * 0.15;
  score += (filters.models?.length || 0) * 0.1;

  // Date range complexity
  if (filters.createdAfter || filters.createdBefore) score += 1;
  if (filters.updatedAfter || filters.updatedBefore) score += 1;

  // IP range complexity
  if (filters.ipRange) {
    score += filters.ipRange.cidr ? 2 : 1;
  }

  // Tag filter complexity
  if (filters.tagFilter) {
    score += (filters.tagFilter.include?.length || 0) * 0.3;
    score += (filters.tagFilter.exclude?.length || 0) * 0.2;
    if (filters.tagFilter.logic === 'OR') score += 1; // OR is more complex than AND
  }

  // Search complexity
  if (filters.searchQuery) {
    score += filters.searchQuery.length > 50 ? 2 : 1;
  }

  return Math.round(score * 10) / 10; // Round to 1 decimal place
};

// =============================================================================
// ERROR HELPERS
// =============================================================================

/**
 * Formats Zod validation errors for user display
 */
export const formatValidationError = (error: z.ZodError): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    fieldErrors[path] = issue.message;
  }

  return fieldErrors;
};

/**
 * Gets user-friendly error message for common validation failures
 */
export const getUserFriendlyErrorMessage = (error: z.ZodError): string => {
  const firstIssue = error.issues[0];
  const fieldPath = firstIssue.path?.join('.') || 'field';

  switch (firstIssue.code) {
    case 'invalid_type':
      return `Invalid ${fieldPath} format`;
    case 'too_small':
      return `${fieldPath} is too short or small`;
    case 'too_big':
      return `${fieldPath} is too long or large`;
    default:
      return firstIssue.message;
  }
};

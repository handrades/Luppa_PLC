/**
 * Cell Validation Schemas
 *
 * Joi validation schemas for all cell operations.
 * Provides comprehensive validation with detailed error messages.
 */

import Joi from 'joi';
import { ValidationError, ValidationErrorDetail } from '../errors/ValidationError';

/**
 * UUID validation schema
 */
const uuidSchema = Joi.string().uuid().messages({
  'string.guid': 'Must be a valid UUID',
});

/**
 * Cell name validation schema
 */
const cellNameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9\s_-]+$/)
  .required()
  .messages({
    'string.min': 'Cell name must be at least 1 character',
    'string.max': 'Cell name cannot exceed 100 characters',
    'string.pattern.base':
      'Cell name can only contain letters, numbers, spaces, hyphens, and underscores',
    'any.required': 'Cell name is required',
  });

/**
 * Line number validation schema
 */
const lineNumberSchema = Joi.string()
  .trim()
  .min(1)
  .max(50)
  .pattern(/^[A-Z0-9-]+$/)
  .uppercase()
  .required()
  .messages({
    'string.min': 'Line number must be at least 1 character',
    'string.max': 'Line number cannot exceed 50 characters',
    'string.pattern.base': 'Line number must be uppercase alphanumeric with hyphens only',
    'any.required': 'Line number is required',
  });

/**
 * Cell ID parameter validation
 */
export const cellIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'any.required': 'Cell ID is required',
  }),
});

/**
 * Site ID parameter validation for cell routes
 */
export const siteIdParamSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required',
  }),
});

/**
 * Create cell request validation
 */
export const createCellSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required',
  }),
  name: cellNameSchema,
  lineNumber: lineNumberSchema,
});

/**
 * Update cell request validation
 */
export const updateCellSchema = Joi.object({
  name: cellNameSchema.optional(),
  lineNumber: lineNumberSchema.optional(),
  updatedAt: Joi.string().isoDate().required().messages({
    'string.isoDate': 'updatedAt must be a valid ISO date string',
    'any.required': 'updatedAt is required for optimistic locking',
  }),
})
  .min(2)
  .messages({
    'object.min':
      'At least one field (name or lineNumber) must be provided for update, along with updatedAt',
  });

/**
 * Cell search/filter validation
 */
export const cellSearchSchema = Joi.object({
  siteId: uuidSchema.optional(),
  search: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Search query cannot exceed 100 characters',
  }),
  includeEmpty: Joi.boolean().optional().default(true),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    'number.min': 'Page must be at least 1',
    'number.integer': 'Page must be an integer',
  }),
  pageSize: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    'number.min': 'Page size must be at least 1',
    'number.max': 'Page size cannot exceed 100',
    'number.integer': 'Page size must be an integer',
  }),
  sortBy: Joi.string()
    .valid('name', 'lineNumber', 'createdAt', 'equipmentCount')
    .optional()
    .default('name')
    .messages({
      'any.only': 'Sort field must be one of: name, lineNumber, createdAt, equipmentCount',
    }),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('ASC').messages({
    'any.only': 'Sort order must be either ASC or DESC',
  }),
});

/**
 * Cell suggestions validation
 */
export const cellSuggestionsSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required for cell suggestions',
  }),
  q: Joi.string().trim().min(1).max(100).required().messages({
    'string.min': 'Query must be at least 1 character',
    'string.max': 'Query cannot exceed 100 characters',
    'any.required': 'Query parameter (q) is required',
  }),
  limit: Joi.number().integer().min(1).max(50).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 50',
    'number.integer': 'Limit must be an integer',
  }),
});

/**
 * Cell statistics request validation
 */
export const cellStatisticsSchema = Joi.object({
  includeCounts: Joi.boolean().optional().default(true),
  includePerSite: Joi.boolean().optional().default(true),
});

/**
 * Bulk operations validation for cells
 */
export const cellBulkOperationSchema = Joi.object({
  operation: Joi.string().valid('delete', 'export', 'move').required().messages({
    'any.only': 'Operation must be one of: delete, export, move',
    'any.required': 'Operation is required',
  }),
  cellIds: Joi.array().items(uuidSchema).min(1).max(50).unique().required().messages({
    'array.min': 'At least one cell ID is required',
    'array.max': 'Cannot perform bulk operation on more than 50 cells at once',
    'array.unique': 'Cell IDs must be unique',
    'any.required': 'Cell IDs are required',
  }),
  targetSiteId: Joi.when('operation', {
    is: 'move',
    then: uuidSchema.required().messages({
      'any.required': 'Target site ID is required for move operations',
    }),
    otherwise: uuidSchema.optional(),
  }),
});

/**
 * Cell uniqueness validation
 */
export const cellUniquenessSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required',
  }),
  lineNumber: lineNumberSchema,
  excludeId: uuidSchema.optional(),
});

/**
 * Hierarchy integrity validation
 */
export const hierarchyIntegritySchema = Joi.object({
  checkOrphans: Joi.boolean().optional().default(true),
  checkDuplicates: Joi.boolean().optional().default(true),
  checkConstraints: Joi.boolean().optional().default(true),
});

/**
 * Site-specific cell list validation
 */
export const sitesCellsParamSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required',
  }),
});

/**
 * Validation helper function with custom error handling
 */
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (data: unknown) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationErrors: ValidationErrorDetail[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new ValidationError('Validation failed', validationErrors);
    }

    return value;
  };
};

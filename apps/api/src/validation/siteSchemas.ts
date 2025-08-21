/**
 * Site Validation Schemas
 *
 * Joi validation schemas for all site operations.
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
 * Site name validation schema
 */
const siteNameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9\s_-]+$/)
  .required()
  .messages({
    'string.min': 'Site name must be at least 1 character',
    'string.max': 'Site name cannot exceed 100 characters',
    'string.pattern.base':
      'Site name can only contain letters, numbers, spaces, hyphens, and underscores',
    'any.required': 'Site name is required',
  });

/**
 * Site ID parameter validation
 */
export const siteIdParamSchema = Joi.object({
  siteId: uuidSchema.required().messages({
    'any.required': 'Site ID is required',
  }),
});

/**
 * Create site request validation
 */
export const createSiteSchema = Joi.object({
  name: siteNameSchema,
});

/**
 * Update site request validation
 */
export const updateSiteSchema = Joi.object({
  name: siteNameSchema.optional(),
  updatedAt: Joi.string().isoDate().required().messages({
    'string.isoDate': 'updatedAt must be a valid ISO date string',
    'any.required': 'updatedAt is required for optimistic locking',
  }),
});

/**
 * Site search/filter validation
 */
export const siteSearchSchema = Joi.object({
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
    .valid('name', 'createdAt', 'cellCount', 'equipmentCount')
    .optional()
    .default('name')
    .messages({
      'any.only': 'Sort field must be one of: name, createdAt, cellCount, equipmentCount',
    }),
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional().default('ASC').messages({
    'any.only': 'Sort order must be either ASC/asc or DESC/desc',
  }),
});

/**
 * Site suggestions validation
 */
export const siteSuggestionsSchema = Joi.object({
  q: Joi.string().trim().min(0).max(100).optional().allow('').default('').messages({
    'string.max': 'Query cannot exceed 100 characters',
  }),
  limit: Joi.number().integer().min(1).max(50).optional().default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 50',
    'number.integer': 'Limit must be an integer',
  }),
});

/**
 * Site statistics request validation
 */
export const siteStatisticsSchema = Joi.object({
  includeCounts: Joi.boolean().optional().default(true),
});

/**
 * Bulk operations validation
 */
export const siteBulkOperationSchema = Joi.object({
  operation: Joi.string().valid('delete', 'export').required().messages({
    'any.only': 'Operation must be either delete or export',
    'any.required': 'Operation is required',
  }),
  siteIds: Joi.array().items(uuidSchema).min(1).max(50).unique().required().messages({
    'array.min': 'At least one site ID is required',
    'array.max': 'Cannot perform bulk operation on more than 50 sites at once',
    'array.unique': 'Site IDs must be unique',
    'any.required': 'Site IDs are required',
  }),
});

/**
 * Site uniqueness validation
 */
export const siteUniquenessSchema = Joi.object({
  name: siteNameSchema,
  excludeId: uuidSchema.optional(),
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

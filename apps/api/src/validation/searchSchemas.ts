/**
 * Search Validation Schemas
 *
 * Joi validation schemas for search operations.
 * Provides comprehensive validation for search queries and parameters.
 */

import Joi from 'joi';
import { ValidationError } from '../errors/ValidationError';

/**
 * Search query validation schema
 */
const searchQuerySchema = Joi.string().trim().min(1).max(100).required().messages({
  'string.min': 'Search query must be at least 1 character',
  'string.max': 'Search query cannot exceed 100 characters',
  'any.required': 'Search query is required',
});

/**
 * Search fields validation schema
 */
const searchFieldsSchema = Joi.array()
  .items(
    Joi.string().valid(
      'description',
      'make',
      'model',
      'tag_id',
      'site_name',
      'cell_name',
      'equipment_name',
      'equipment_type',
      'ip_address',
      'firmware_version'
    )
  )
  .optional()
  .messages({
    'array.includes':
      'Invalid search field. Valid fields are: description, make, model, tag_id, site_name, cell_name, equipment_name, equipment_type, ip_address, firmware_version',
  });

/**
 * Pagination validation schemas
 */
const pageSchema = Joi.number().integer().min(1).max(1000).default(1).messages({
  'number.base': 'Page must be a number',
  'number.integer': 'Page must be an integer',
  'number.min': 'Page must be at least 1',
  'number.max': 'Page cannot exceed 1000',
});

const pageSizeSchema = Joi.number().integer().min(1).max(100).default(50).messages({
  'number.base': 'Page size must be a number',
  'number.integer': 'Page size must be an integer',
  'number.min': 'Page size must be at least 1',
  'number.max': 'Page size cannot exceed 100',
});

const maxResultsSchema = Joi.number().integer().min(1).max(10000).default(1000).messages({
  'number.base': 'Max results must be a number',
  'number.integer': 'Max results must be an integer',
  'number.min': 'Max results must be at least 1',
  'number.max': 'Max results cannot exceed 10000',
});

/**
 * Sort validation schemas
 */
const sortBySchema = Joi.string()
  .valid(
    'relevance',
    'tag_id',
    'make',
    'model',
    'site_name',
    'cell_name',
    'equipment_name',
    'equipment_type'
  )
  .default('relevance')
  .messages({
    'any.only':
      'Sort field must be one of: relevance, tag_id, make, model, site_name, cell_name, equipment_name, equipment_type',
  });

const sortOrderSchema = Joi.string()
  .valid('ASC', 'DESC', 'asc', 'desc')
  .uppercase()
  .default('DESC')
  .messages({
    'any.only': 'Sort order must be either ASC or DESC',
  });

/**
 * Boolean flags validation schemas
 */
const includeHighlightsSchema = Joi.boolean().default(true).messages({
  'boolean.base': 'Include highlights must be a boolean value',
});

/**
 * Search suggestions validation schema
 */
const suggestionLimitSchema = Joi.number().integer().min(1).max(20).default(10).messages({
  'number.base': 'Suggestion limit must be a number',
  'number.integer': 'Suggestion limit must be an integer',
  'number.min': 'Suggestion limit must be at least 1',
  'number.max': 'Suggestion limit cannot exceed 20',
});

/**
 * Main search validation schema
 */
export const searchEquipmentSchema = Joi.object({
  q: searchQuerySchema,
  fields: searchFieldsSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
  maxResults: maxResultsSchema,
  sortBy: sortBySchema,
  sortOrder: sortOrderSchema,
  includeHighlights: includeHighlightsSchema,
})
  .unknown(false)
  .messages({
    'object.unknown': 'Unknown query parameter: {#label}',
  });

/**
 * Search suggestions validation schema
 */
export const searchSuggestionsSchema = Joi.object({
  q: Joi.string().trim().min(1).max(50).required().messages({
    'string.min': 'Partial query must be at least 1 character',
    'string.max': 'Partial query cannot exceed 50 characters',
    'any.required': 'Partial query is required',
  }),
  limit: suggestionLimitSchema,
})
  .unknown(false)
  .messages({
    'object.unknown': 'Unknown query parameter: {#label}',
  });

/**
 * Search metrics validation schema
 */
export const searchMetricsSchema = Joi.object({
  timeRange: Joi.string().valid('1h', '24h', '7d', '30d').default('24h').messages({
    'any.only': 'Time range must be one of: 1h, 24h, 7d, 30d',
  }),
  includeDetails: Joi.boolean().default(false).messages({
    'boolean.base': 'Include details must be a boolean value',
  }),
})
  .unknown(false)
  .messages({
    'object.unknown': 'Unknown query parameter: {#label}',
  });

/**
 * Validation middleware helper function
 */
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (data: unknown) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw ValidationError.forFields(
        validationErrors.reduce(
          (acc, err) => {
            acc[err.field] = err.message;
            return acc;
          },
          {} as Record<string, string>
        )
      );
    }

    return value;
  };
};

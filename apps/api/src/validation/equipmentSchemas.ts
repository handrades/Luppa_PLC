/**
 * Equipment Validation Schemas
 *
 * Joi validation schemas for all equipment operations.
 * Provides comprehensive validation with detailed error messages.
 */

import Joi from 'joi';
import { EquipmentType } from '../entities/Equipment';
import { ValidationError } from '../errors/ValidationError';

/**
 * UUID validation schema
 */
const uuidSchema = Joi.string().uuid().messages({
  'string.guid': 'Must be a valid UUID',
});

/**
 * Equipment name validation schema
 */
const equipmentNameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9\s_-]+$/)
  .required()
  .messages({
    'string.min': 'Equipment name must be at least 1 character',
    'string.max': 'Equipment name cannot exceed 100 characters',
    'string.pattern.base':
      'Equipment name can only contain letters, numbers, spaces, hyphens, and underscores',
    'any.required': 'Equipment name is required',
  });

/**
 * Equipment type validation schema
 */
const equipmentTypeSchema = Joi.string()
  .valid(...Object.values(EquipmentType))
  .required()
  .messages({
    'any.only': `Equipment type must be one of: ${Object.values(EquipmentType).join(', ')}`,
    'any.required': 'Equipment type is required',
  });

/**
 * PLC tag ID validation schema
 */
const tagIdSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.min': 'Tag ID must be at least 1 character',
    'string.max': 'Tag ID cannot exceed 100 characters',
    'string.pattern.base': 'Tag ID can only contain letters, numbers, underscores, and hyphens',
    'any.required': 'Tag ID is required',
  });

/**
 * PLC description validation schema
 */
const descriptionSchema = Joi.string().trim().min(1).max(1000).required().messages({
  'string.min': 'Description must be at least 1 character',
  'string.max': 'Description cannot exceed 1000 characters',
  'any.required': 'Description is required',
});

/**
 * Make validation schema
 */
const makeSchema = Joi.string().trim().min(1).max(100).required().messages({
  'string.min': 'Make must be at least 1 character',
  'string.max': 'Make cannot exceed 100 characters',
  'any.required': 'Make is required',
});

/**
 * Model validation schema
 */
const modelSchema = Joi.string().trim().min(1).max(100).required().messages({
  'string.min': 'Model must be at least 1 character',
  'string.max': 'Model cannot exceed 100 characters',
  'any.required': 'Model is required',
});

/**
 * IP address validation schema (INET format)
 */
const ipAddressSchema = Joi.string()
  .ip({
    version: ['ipv4', 'ipv6'],
    cidr: 'optional',
  })
  .optional()
  .messages({
    'string.ip': 'Must be a valid IP address (IPv4 or IPv6)',
  });

/**
 * Firmware version validation schema
 */
const firmwareVersionSchema = Joi.string().trim().min(1).max(50).optional().messages({
  'string.min': 'Firmware version must be at least 1 character',
  'string.max': 'Firmware version cannot exceed 50 characters',
});

/**
 * Search query validation schema
 */
const searchSchema = Joi.string().trim().min(1).max(255).optional().messages({
  'string.min': 'Search term must be at least 1 character',
  'string.max': 'Search term cannot exceed 255 characters',
});

/**
 * Pagination validation schemas
 */
const pageSchema = Joi.number().integer().min(1).default(1).messages({
  'number.base': 'Page must be a number',
  'number.integer': 'Page must be an integer',
  'number.min': 'Page must be at least 1',
});

const pageSizeSchema = Joi.number().integer().min(1).max(100).default(50).messages({
  'number.base': 'Page size must be a number',
  'number.integer': 'Page size must be an integer',
  'number.min': 'Page size must be at least 1',
  'number.max': 'Page size cannot exceed 100',
});

/**
 * Sort validation schemas
 */
const sortBySchema = Joi.string()
  .valid('name', 'equipmentType', 'createdAt', 'siteName', 'cellName', 'make', 'model')
  .default('name')
  .messages({
    'any.only':
      'Sort field must be one of: name, equipmentType, createdAt, siteName, cellName, make, model',
  });

const sortOrderSchema = Joi.string()
  .valid('ASC', 'DESC', 'asc', 'desc')
  .default('ASC')
  .custom((value, _helpers) => {
    // Normalize to uppercase
    return value.toUpperCase();
  })
  .messages({
    'any.only': 'Sort order must be either ASC or DESC',
  });

/**
 * PLC data validation schema for creation
 */
const createPLCDataSchema = Joi.object({
  tagId: tagIdSchema,
  description: descriptionSchema,
  make: makeSchema,
  model: modelSchema,
  ipAddress: ipAddressSchema,
  firmwareVersion: firmwareVersionSchema,
}).messages({
  'object.unknown': 'Unknown field in PLC data: {#label}',
});

/**
 * PLC data validation schema for updates
 */
const updatePLCDataSchema = Joi.object({
  tagId: tagIdSchema.optional(),
  description: descriptionSchema.optional(),
  make: makeSchema.optional(),
  model: modelSchema.optional(),
  ipAddress: ipAddressSchema,
  firmwareVersion: firmwareVersionSchema,
})
  .min(1)
  .messages({
    'object.min': 'At least one PLC field must be provided for update',
    'object.unknown': 'Unknown field in PLC data: {#label}',
  });

/**
 * Create equipment validation schema
 */
export const createEquipmentSchema = Joi.object({
  name: equipmentNameSchema,
  equipmentType: equipmentTypeSchema,
  cellId: uuidSchema.required().messages({
    'any.required': 'Cell ID is required',
  }),
  plcData: createPLCDataSchema.required().messages({
    'any.required': 'PLC data is required',
  }),
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Update equipment validation schema
 */
export const updateEquipmentSchema = Joi.object({
  name: equipmentNameSchema.optional(),
  equipmentType: equipmentTypeSchema.optional(),
  cellId: uuidSchema.optional(),
  plcData: updatePLCDataSchema.optional(),
  updatedAt: Joi.date().iso().required().messages({
    'any.required': 'Current updatedAt timestamp is required for optimistic locking',
    'date.format': 'updatedAt must be a valid ISO date',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
    'object.unknown': 'Unknown field: {#label}',
  });

/**
 * Equipment search filters validation schema
 */
export const equipmentSearchSchema = Joi.object({
  search: searchSchema,
  siteName: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Site name cannot exceed 100 characters',
  }),
  cellName: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Cell name cannot exceed 100 characters',
  }),
  equipmentType: equipmentTypeSchema.optional(),
  make: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Make cannot exceed 100 characters',
  }),
  model: Joi.string().trim().max(100).optional().messages({
    'string.max': 'Model cannot exceed 100 characters',
  }),
  hasIpAddress: Joi.boolean().optional(),
  sortBy: sortBySchema,
  sortOrder: sortOrderSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
}).messages({
  'object.unknown': 'Unknown query parameter: {#label}',
});

/**
 * Equipment ID parameter validation schema
 */
export const equipmentIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'any.required': 'Equipment ID is required',
  }),
});

/**
 * Bulk operation validation schema
 */
export const bulkOperationSchema = Joi.object({
  equipmentIds: Joi.array().items(uuidSchema.required()).min(1).max(50).required().messages({
    'array.min': 'At least one equipment ID must be provided',
    'array.max': 'Cannot perform bulk operation on more than 50 equipment items at once',
    'any.required': 'Equipment IDs are required',
  }),
  operation: Joi.string().valid('delete', 'export').required().messages({
    'any.only': 'Operation must be either delete or export',
    'any.required': 'Operation is required',
  }),
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Site/Cell filter validation schema
 */
export const siteFilterSchema = Joi.object({
  siteId: uuidSchema.optional(),
  cellId: uuidSchema.optional(),
}).messages({
  'object.unknown': 'Unknown query parameter: {#label}',
});

/**
 * Statistics request validation schema
 */
export const statisticsRequestSchema = Joi.object({
  siteId: uuidSchema.optional(),
  cellId: uuidSchema.optional(),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Start date must be a valid ISO date',
  }),
  endDate: Joi.date().iso().optional().messages({
    'date.format': 'End date must be a valid ISO date',
  }),
}).messages({
  'object.unknown': 'Unknown query parameter: {#label}',
});

/**
 * Validation middleware helper function
 */
export const validateSchema = (schema: Joi.ObjectSchema) => {
  return (data: unknown) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
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

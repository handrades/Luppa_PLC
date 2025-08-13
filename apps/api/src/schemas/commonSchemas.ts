import Joi from 'joi';

/**
 * Common validation schemas for reuse across the application
 *
 * These schemas provide standardized validation patterns for common data types
 * used throughout the API, ensuring consistency and reducing duplication.
 */

/**
 * UUID validation schema
 * Validates that a string is a valid UUID (v4)
 */
export const uuidSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .required()
  .messages({
    'string.guid': 'Must be a valid UUID',
    'any.required': 'UUID is required',
  });

/**
 * Optional UUID validation schema
 */
export const optionalUuidSchema = Joi.string()
  .uuid({ version: ['uuidv4'] })
  .optional()
  .messages({
    'string.guid': 'Must be a valid UUID',
  });

/**
 * Email validation schema
 * Validates email addresses with comprehensive rules
 */
export const emailSchema = Joi.string()
  .email({ tlds: { allow: false } }) // Allow any TLD for flexibility
  .max(255)
  .required()
  .messages({
    'string.email': 'Must be a valid email address',
    'string.max': 'Email must not exceed 255 characters',
    'any.required': 'Email is required',
  });

/**
 * Optional email validation schema
 */
export const optionalEmailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(255)
  .optional()
  .allow('')
  .messages({
    'string.email': 'Must be a valid email address',
    'string.max': 'Email must not exceed 255 characters',
  });

/**
 * IP address validation schema (IPv4)
 * Used for PLC IP address validation
 */
export const ipAddressSchema = Joi.string()
  .ip({ version: ['ipv4'] })
  .required()
  .messages({
    'string.ip': 'Must be a valid IPv4 address',
    'any.required': 'IP address is required',
  });

/**
 * Optional IP address validation schema
 */
export const optionalIpAddressSchema = Joi.string()
  .ip({ version: ['ipv4'] })
  .optional()
  .allow(null)
  .messages({
    'string.ip': 'Must be a valid IPv4 address',
  });

/**
 * Password validation schema
 * Enforces strong password requirements for security
 */
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

/**
 * Name validation schema
 * Used for user names, site names, etc.
 */
export const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(255)
  .pattern(/^[a-zA-Z0-9\s\-_.]+$/)
  .required()
  .messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters',
    'string.pattern.base':
      'Name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
    'any.required': 'Name is required',
  });

/**
 * Optional name validation schema
 */
export const optionalNameSchema = Joi.string()
  .trim()
  .min(1)
  .max(255)
  .pattern(/^[a-zA-Z0-9\s\-_.]+$/)
  .optional()
  .allow('')
  .messages({
    'string.min': 'Name must not be empty',
    'string.max': 'Name must not exceed 255 characters',
    'string.pattern.base':
      'Name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
  });

/**
 * Description validation schema
 * Used for optional description fields
 */
export const descriptionSchema = Joi.string().trim().max(1000).optional().allow('').messages({
  'string.max': 'Description must not exceed 1000 characters',
});

/**
 * Pagination validation schemas
 */
export const pageSchema = Joi.number().integer().min(1).default(1).messages({
  'number.integer': 'Page must be an integer',
  'number.min': 'Page must be at least 1',
});

export const pageSizeSchema = Joi.number().integer().min(1).max(100).default(20).messages({
  'number.integer': 'Page size must be an integer',
  'number.min': 'Page size must be at least 1',
  'number.max': 'Page size must not exceed 100',
});

/**
 * Search query validation schema
 */
export const searchQuerySchema = Joi.string().trim().min(1).max(100).optional().messages({
  'string.min': 'Search query must not be empty',
  'string.max': 'Search query must not exceed 100 characters',
});

/**
 * Boolean validation schema
 */
export const booleanSchema = Joi.boolean().required().messages({
  'boolean.base': 'Must be a boolean value (true or false)',
  'any.required': 'Boolean value is required',
});

/**
 * Optional boolean validation schema
 */
export const optionalBooleanSchema = Joi.boolean().optional().messages({
  'boolean.base': 'Must be a boolean value (true or false)',
});

/**
 * Date validation schema
 */
export const dateSchema = Joi.date().iso().required().messages({
  'date.format': 'Must be a valid ISO 8601 date',
  'any.required': 'Date is required',
});

/**
 * Optional date validation schema
 */
export const optionalDateSchema = Joi.date().iso().optional().messages({
  'date.format': 'Must be a valid ISO 8601 date',
});

/**
 * Array validation schema for tags
 */
export const tagsSchema = Joi.array()
  .items(Joi.string().trim().min(1).max(50))
  .max(20)
  .unique()
  .optional()
  .messages({
    'array.max': 'Cannot have more than 20 tags',
    'array.unique': 'Tags must be unique',
    'string.min': 'Tag cannot be empty',
    'string.max': 'Tag must not exceed 50 characters',
  });

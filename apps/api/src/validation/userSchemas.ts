/**
 * User Validation Schemas
 *
 * Joi validation schemas for all user operations.
 * Provides comprehensive validation with detailed error messages.
 */

import Joi from 'joi';
import { ValidationError } from '../errors/ValidationError';

/**
 * Password complexity requirements
 */
const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  });

/**
 * UUID validation schema
 */
const uuidSchema = Joi.string().uuid().messages({
  'string.guid': 'Must be a valid UUID',
});

/**
 * Email validation schema
 */
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(255)
  .required()
  .messages({
    'string.email': 'Must be a valid email address',
    'string.max': 'Email address cannot exceed 255 characters',
    'any.required': 'Email is required',
  });

/**
 * Name validation schema (for firstName and lastName)
 */
const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z\s\-'.]+$/)
  .required()
  .messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name cannot exceed 100 characters',
    'string.pattern.base':
      'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
    'any.required': 'Name is required',
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
  .valid('firstName', 'lastName', 'email', 'createdAt')
  .default('firstName')
  .messages({
    'any.only': 'Sort field must be one of: firstName, lastName, email, createdAt',
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
 * Create user validation schema
 */
export const createUserSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  roleId: uuidSchema.optional(),
  isActive: Joi.boolean().default(true),
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Update user validation schema
 */
export const updateUserSchema = Joi.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  roleId: uuidSchema.optional(),
  isActive: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
    'object.unknown': 'Unknown field: {#label}',
  });

/**
 * User search filters validation schema
 */
export const userSearchSchema = Joi.object({
  search: searchSchema,
  roleId: uuidSchema.optional(),
  isActive: Joi.boolean().optional(),
  sortBy: sortBySchema,
  sortOrder: sortOrderSchema,
  page: pageSchema,
  pageSize: pageSizeSchema,
}).messages({
  'object.unknown': 'Unknown query parameter: {#label}',
});

/**
 * User ID parameter validation schema
 */
export const userIdParamSchema = Joi.object({
  id: uuidSchema.required().messages({
    'any.required': 'User ID is required',
  }),
});

/**
 * Role assignment validation schema
 */
export const assignRoleSchema = Joi.object({
  roleId: uuidSchema.required().messages({
    'any.required': 'Role ID is required',
  }),
  reason: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Reason cannot exceed 500 characters',
  }),
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Password reset request validation schema
 */
export const passwordResetRequestSchema = Joi.object({
  email: emailSchema,
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Password reset verification validation schema
 */
export const passwordResetVerifySchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
    'string.empty': 'Reset token cannot be empty',
  }),
  newPassword: passwordSchema,
}).messages({
  'object.unknown': 'Unknown field: {#label}',
});

/**
 * Password change validation schema
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
}).messages({
  'object.unknown': 'Unknown field: {#label}',
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

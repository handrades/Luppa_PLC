import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';
import { AppError } from './errorHandler';

/**
 * Validation options for request validation middleware
 */
export interface ValidationOptions {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

/**
 * Formatted validation error for API responses
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Custom validation error class for Joi validation failures
 */
export class JoiValidationError extends AppError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message, 400, 'VALIDATION_ERROR', errors);
    this.errors = errors;
  }
}

/**
 * Formats Joi validation errors into a consistent API response format
 *
 * @param error - Joi validation error object
 * @returns Array of formatted validation errors
 */
export const formatValidationErrors = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));
};

/**
 * Creates validation middleware for Express routes using Joi schemas
 *
 * This middleware validates request body, query parameters, and URL parameters
 * against provided Joi schemas. It returns detailed error messages for validation
 * failures and ensures all validation errors are properly formatted.
 *
 * @param options - Validation options containing Joi schemas for different request parts
 * @returns Express middleware function
 */
export const validate = (options: ValidationOptions) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationPromises: Promise<unknown>[] = [];
      const validationKeys: string[] = [];

      // Validate request body if schema provided
      if (options.body) {
        validationPromises.push(options.body.validateAsync(req.body, { abortEarly: false }));
        validationKeys.push('body');
      }

      // Validate query parameters if schema provided
      if (options.query) {
        validationPromises.push(options.query.validateAsync(req.query, { abortEarly: false }));
        validationKeys.push('query');
      }

      // Validate URL parameters if schema provided
      if (options.params) {
        validationPromises.push(options.params.validateAsync(req.params, { abortEarly: false }));
        validationKeys.push('params');
      }

      // Execute all validations concurrently and assign results back
      const validationResults = await Promise.all(validationPromises);

      // Assign validated values back to request object
      validationResults.forEach((result, index) => {
        const key = validationKeys[index];
        if (key === 'body') {
          req.body = result;
        } else if (key === 'query') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          req.query = result as any;
        } else if (key === 'params') {
          req.params = result as Record<string, string>;
        }
      });

      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        const formattedErrors = formatValidationErrors(error);
        const validationError = new JoiValidationError('Validation failed', formattedErrors);

        logger.warn('Request validation failed', {
          requestId: req.id,
          url: req.originalUrl,
          method: req.method,
          errors: formattedErrors,
        });

        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

/**
 * Helper function for body-only validation
 *
 * @param schema - Joi schema for request body validation
 * @returns Express middleware function
 */
export const validateBody = (schema: Joi.Schema) => {
  return validate({ body: schema });
};

/**
 * Helper function for query parameter validation
 *
 * @param schema - Joi schema for query parameter validation
 * @returns Express middleware function
 */
export const validateQuery = (schema: Joi.Schema) => {
  return validate({ query: schema });
};

/**
 * Helper function for URL parameter validation
 *
 * @param schema - Joi schema for URL parameter validation
 * @returns Express middleware function
 */
export const validateParams = (schema: Joi.Schema) => {
  return validate({ params: schema });
};

/**
 * Validation Utilities
 *
 * Common validation error handling utilities to reduce code duplication
 * across route handlers.
 */

import { Response } from 'express';
import { ValidationError as JoiValidationError } from 'joi';
import { ValidationError } from '../errors/ValidationError';

/**
 * Standard validation error response structure
 */
export interface ValidationErrorResponse {
  error: string;
  message: string;
  errors?: string[];
}

/**
 * Send standardized validation error response
 */
export function sendValidationError(
  res: Response,
  error: JoiValidationError,
  statusCode: number = 400
): void {
  const validationError = ValidationError.fromJoi(error);
  res.status(statusCode).json(validationError.getErrorResponse());
}

/**
 * Send generic validation error response with custom message
 */
export function sendGenericValidationError(
  res: Response,
  message: string,
  statusCode: number = 400
): void {
  const validationError = new ValidationError(message, [], statusCode);
  res.status(statusCode).json(validationError.getErrorResponse());
}

/**
 * Check if an error is a Joi validation error and handle it
 * Returns true if handled, false if not a validation error
 */
export function handleValidationError(res: Response, error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'isJoi' in error &&
    (error as { isJoi: boolean }).isJoi
  ) {
    sendValidationError(res, error as JoiValidationError);
    return true;
  }
  if (ValidationError.isValidationError(error)) {
    res.status(error.statusCode).json(error.getErrorResponse());
    return true;
  }
  return false;
}

/**
 * Handle validation errors from validateSchema function that throw JSON strings
 * Returns true if handled, false if not a validation error
 */
export function handleValidationErrorFromMessage(res: Response, message: string): boolean {
  if (message.includes('Validation failed')) {
    try {
      const validationError = JSON.parse(message);
      res.status(400).json({
        error: 'Validation error',
        message: validationError.message,
        errors: validationError.errors,
      });
      return true;
    } catch {
      // If JSON parse fails, treat as generic validation error
      sendGenericValidationError(res, 'Validation failed');
      return true;
    }
  }
  return false;
}

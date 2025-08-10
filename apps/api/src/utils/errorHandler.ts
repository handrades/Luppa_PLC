/**
 * Centralized Error Handling Utilities
 *
 * Provides consistent error handling and response formatting across all routes.
 */

import { Response } from 'express';
import { logger } from '../config/logger';

/**
 * Custom validation error class for type-safe error handling
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }> = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Custom business logic error class
 */
export class BusinessLogicError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'BusinessLogicError';
    this.statusCode = statusCode;
  }
}

/**
 * Handle errors consistently across all routes
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  defaultMessage: string,
  requestContext?: {
    operation?: string;
    userId?: string;
    ipAddress?: string;
    [key: string]: unknown;
  }
): void {
  const message = error instanceof Error ? error.message : defaultMessage;

  // Check for validation errors
  if (error instanceof ValidationError || message.includes('Validation failed')) {
    try {
      let validationError;
      if (error instanceof ValidationError) {
        validationError = { message: error.message, errors: error.errors };
      } else {
        validationError = JSON.parse(message);
      }

      res.status(400).json({
        error: 'Validation error',
        message: validationError.message,
        errors: validationError.errors,
      });
    } catch {
      // Handle plain string validation errors
      res.status(400).json({
        error: 'Validation error',
        message,
      });
    }
    return;
  }

  // Handle business logic errors with specific status codes
  if (error instanceof BusinessLogicError) {
    res.status(error.statusCode).json({
      error: getErrorType(error.statusCode),
      message: error.message,
    });

    if (error.statusCode >= 500) {
      logger.error(defaultMessage, {
        error: message,
        ...requestContext,
      });
    }
    return;
  }

  // Handle specific business logic error messages
  if (message.includes('Email address already exists')) {
    res.status(409).json({
      error: 'Conflict',
      message: 'Email address is already in use',
    });
    return;
  }

  if (message.includes('not found') || message.includes('User not found')) {
    res.status(404).json({
      error: 'Not found',
      message: message.includes('User') ? 'User not found' : 'Resource not found',
    });
    return;
  }

  if (message.includes('Role not found')) {
    res.status(400).json({
      error: 'Invalid role',
      message: 'Specified role does not exist',
    });
    return;
  }

  if (
    message.includes('New role not found') ||
    message.includes('Default Engineer role not found')
  ) {
    res.status(400).json({
      error: 'Invalid role',
      message: 'Specified role does not exist',
    });
    return;
  }

  if (message.includes('User is already inactive')) {
    res.status(400).json({
      error: 'Bad request',
      message: 'User is already inactive',
    });
    return;
  }

  if (message.includes('User already has this role')) {
    res.status(400).json({
      error: 'Bad request',
      message: 'User already has this role',
    });
    return;
  }

  if (message.includes('User account has been deactivated')) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'User account has been deactivated',
    });
    return;
  }

  // Log server errors
  logger.error(defaultMessage, {
    error: message,
    ...requestContext,
  });

  // Default to 500 for unhandled errors
  res.status(500).json({
    error: 'Internal server error',
    message: defaultMessage,
  });
}

/**
 * Get appropriate error type string for HTTP status codes
 */
function getErrorType(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 429:
      return 'Too many requests';
    case 500:
      return 'Internal server error';
    case 503:
      return 'Service unavailable';
    default:
      return 'Error';
  }
}

/**
 * Sanitize error messages to prevent sensitive information leakage
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove connection strings and credentials
  const sanitized = message
    .replace(/postgres:\/\/[^@]+@[^/]+\/[^\s]+/gi, '[REDACTED_DB_CONNECTION]')
    .replace(/password[=:]\s*[^\s]+/gi, 'password=[REDACTED]')
    .replace(/token[=:]\s*[^\s]+/gi, 'token=[REDACTED]')
    .replace(/secret[=:]\s*[^\s]+/gi, 'secret=[REDACTED]')
    .replace(/api[_-]?key[=:]\s*[^\s]+/gi, 'api_key=[REDACTED]');

  return sanitized;
}

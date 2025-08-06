import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

/**
 * Standardized error response format for API endpoints
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Base application error class for handling operational errors
 *
 * This class extends the native Error class to provide additional context
 * for HTTP errors including status codes, error codes, and optional details.
 * It's designed to distinguish between operational errors (expected errors
 * that should be handled gracefully) and programming errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  /**
   * Creates a new AppError instance
   *
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (defaults to 500)
   * @param code - Machine-readable error code (defaults to 'INTERNAL_ERROR')
   * @param details - Optional additional error details for debugging
   */
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for request data that doesn't meet requirements
 *
 * Used when request data fails validation (e.g., missing required fields,
 * invalid format, out of range values). Automatically sets status code to 400.
 */
export class ValidationError extends AppError {
  /**
   * Creates a new ValidationError
   *
   * @param message - Description of the validation failure
   * @param details - Optional validation details (e.g., which fields failed)
   */
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Error for when a requested resource cannot be found
 *
 * Used when a specific resource (by ID, name, etc.) doesn't exist.
 * Automatically sets status code to 404.
 */
export class NotFoundError extends AppError {
  /**
   * Creates a new NotFoundError
   *
   * @param message - Description of what resource was not found (defaults to generic message)
   */
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error for authentication and authorization failures
 *
 * Used when a request lacks proper authentication or the authenticated
 * user doesn't have permission to access the resource.
 * Automatically sets status code to 401.
 */
export class UnauthorizedError extends AppError {
  /**
   * Creates a new UnauthorizedError
   *
   * @param message - Description of the authorization failure (defaults to generic message)
   */
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Global Express error handler middleware
 *
 * This middleware catches all errors thrown in the application and converts them
 * into standardized HTTP responses. It handles both operational errors (AppError instances)
 * and unexpected errors, logging appropriately and returning consistent error responses.
 *
 * Features:
 * - Standardized error response format
 * - Request ID tracking for debugging
 * - Appropriate logging levels (error vs warn)
 * - Security-conscious error messages (no sensitive info leakage)
 *
 * @param error - The error that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused but required for error middleware signature)
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // const requestId = (req as { id?: string }).id || 'unknown';
  const requestId = 'temp-id'; // Temporary fix
  const timestamp = new Date().toISOString();

  // Default error response
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: unknown = undefined;

  // Handle known application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  }

  // Log the error
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Request error', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    message: error.message,
    stack: error.stack,
    details,
  });

  // Send error response
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      requestId,
      timestamp,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler middleware
 *
 * This middleware handles requests to routes that don't exist in the application.
 * It creates a NotFoundError with details about the attempted route and passes it
 * to the error handler middleware.
 *
 * Should be registered after all route handlers but before the error handler.
 *
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Express next function to pass error to error handler
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

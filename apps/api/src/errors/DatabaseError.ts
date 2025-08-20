/**
 * Custom Database Error Class
 *
 * Provides standardized error handling for database operations including
 * connection errors, constraint violations, and transaction failures.
 */

/**
 * Custom database error class for consistent error handling
 */
export class DatabaseError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string = 'Database error';
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error, statusCode: number = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DatabaseError.prototype);

    // Capture stack trace if available (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /**
   * Create DatabaseError from TypeORM error
   */
  static fromTypeORM(error: Error): DatabaseError {
    let message = 'Database operation failed';
    let statusCode = 500;

    // Handle specific TypeORM error types
    if (error.name === 'QueryFailedError') {
      message = 'Database query failed';
      statusCode = 400;
    } else if (error.name === 'EntityNotFoundError') {
      message = 'Record not found';
      statusCode = 404;
    } else if (error.message.includes('duplicate key value')) {
      message = 'Duplicate record detected';
      statusCode = 409;
    } else if (error.message.includes('foreign key constraint')) {
      message = 'Foreign key constraint violation';
      statusCode = 409;
    } else if (error.message.includes('connection')) {
      message = 'Database connection error';
      statusCode = 503;
    }

    return new DatabaseError(message, error, statusCode);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.errorType,
      message: this.message,
      statusCode: this.statusCode,
      originalError: this.originalError?.message,
    };
  }

  /**
   * Get simplified error response for API
   */
  getErrorResponse(): { error: string; message: string } {
    return {
      error: this.errorType,
      message: this.message,
    };
  }

  /**
   * Check if this error is a database error
   */
  static isDatabaseError(error: unknown): error is DatabaseError {
    return Boolean(
      error instanceof DatabaseError ||
        (error &&
          typeof error === 'object' &&
          'errorType' in error &&
          (error as { errorType: string }).errorType === 'Database error')
    );
  }
}

/**
 * Re-export ValidationError for compatibility
 */
export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  public readonly errorType: string = 'Validation error';

  constructor(message: string, _originalError?: Error) {
    super(message);
    this.name = 'ValidationError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);

    // Capture stack trace if available (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

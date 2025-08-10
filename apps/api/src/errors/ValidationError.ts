/**
 * Custom Validation Error Class
 *
 * Provides a standardized way to handle validation errors throughout the application
 * with consistent error formatting and HTTP status codes.
 */

export interface ValidationErrorDetail {
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * Custom validation error class for consistent error handling
 */
export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly errors: ValidationErrorDetail[];
  public readonly errorType: string = 'ValidationError';

  constructor(message: string, errors: ValidationErrorDetail[] = [], statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.errors = errors;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);

    // Capture stack trace if available (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Create ValidationError from Joi validation error
   */
  static fromJoi(joiError: {
    details: Array<{ path?: (string | number)[]; message: string; context?: { value?: unknown } }>;
  }): ValidationError {
    const errors: ValidationErrorDetail[] = joiError.details.map(detail => ({
      field: detail.path?.map(String).join('.') || undefined,
      message: detail.message,
      value: detail.context?.value,
    }));

    const message =
      errors.length === 1 ? errors[0].message : `${errors.length} validation errors occurred`;

    return new ValidationError(message, errors);
  }

  /**
   * Create ValidationError for a single field
   */
  static forField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(message, [
      {
        field,
        message,
        value,
      },
    ]);
  }

  /**
   * Create ValidationError for multiple fields
   */
  static forFields(fieldErrors: Record<string, string>): ValidationError {
    const errors: ValidationErrorDetail[] = Object.entries(fieldErrors).map(([field, message]) => ({
      field,
      message,
    }));

    const message = `Validation failed for ${errors.length} field${errors.length === 1 ? '' : 's'}`;
    return new ValidationError(message, errors);
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.errorType,
      message: this.message,
      statusCode: this.statusCode,
      errors: this.errors.length > 0 ? this.errors : undefined,
    };
  }

  /**
   * Get simplified error response for API
   */
  getErrorResponse(): { error: string; message: string; errors?: string[] } {
    const response: { error: string; message: string; errors?: string[] } = {
      error: 'Validation error',
      message: this.message,
    };

    if (this.errors.length > 1) {
      response.errors = this.errors.map(e => e.message);
    }

    return response;
  }

  /**
   * Check if this error is a validation error
   */
  static isValidationError(error: unknown): error is ValidationError {
    return Boolean(
      error instanceof ValidationError ||
        (error &&
          typeof error === 'object' &&
          'errorType' in error &&
          (error as { errorType: string }).errorType === 'ValidationError')
    );
  }
}

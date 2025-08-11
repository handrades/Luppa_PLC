/**
 * Domain-specific error classes for user operations
 * Provides specific error types for better error handling and consistent HTTP responses
 */

export class UserError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'UserError';
    this.code = code;
    this.statusCode = statusCode;

    // Set prototype explicitly to ensure instanceof checks work after transpilation
    Object.setPrototypeOf(this, UserError.prototype);

    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserError);
    }
  }
}

export class UserNotFoundError extends UserError {
  constructor(userId: string) {
    super(`User with ID '${userId}' not found`, 'USER_NOT_FOUND', 404);
    this.name = 'UserNotFoundError';
  }
}

export class UserValidationError extends UserError {
  constructor(message: string) {
    super(message, 'USER_VALIDATION_ERROR', 400);
    this.name = 'UserValidationError';
  }
}

export class UserPermissionError extends UserError {
  constructor(message: string = 'Insufficient permissions for user operation') {
    super(message, 'USER_PERMISSION_DENIED', 403);
    this.name = 'UserPermissionError';
  }
}

export class UserConflictError extends UserError {
  constructor(message: string) {
    super(message, 'USER_CONFLICT', 409);
    this.name = 'UserConflictError';
  }
}

/**
 * Utility function to determine if an error is a user-related error
 */
export const isUserError = (error: unknown): error is UserError => {
  return error instanceof UserError;
};

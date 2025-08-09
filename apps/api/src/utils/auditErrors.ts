/**
 * Custom error classes for audit operations
 * Provides specific error types for better error handling and logging
 */

export class AuditError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'AuditError';
    this.code = code;
    this.statusCode = statusCode;

    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuditError);
    }
  }
}

export class AuditValidationError extends AuditError {
  constructor(message: string) {
    super(message, 'AUDIT_VALIDATION_ERROR', 400);
    this.name = 'AuditValidationError';
  }
}

export class AuditNotFoundError extends AuditError {
  constructor(message: string = 'Audit log not found') {
    super(message, 'AUDIT_NOT_FOUND', 404);
    this.name = 'AuditNotFoundError';
  }
}

export class AuditPermissionError extends AuditError {
  constructor(message: string = 'Insufficient permissions for audit access') {
    super(message, 'AUDIT_PERMISSION_DENIED', 403);
    this.name = 'AuditPermissionError';
  }
}

export class AuditPerformanceError extends AuditError {
  constructor(message: string, duration: number) {
    super(`${message} (duration: ${duration}ms)`, 'AUDIT_PERFORMANCE_VIOLATION', 500);
    this.name = 'AuditPerformanceError';
  }
}

export class AuditImmutabilityError extends AuditError {
  constructor(message: string = 'Audit logs are immutable and cannot be modified') {
    super(message, 'AUDIT_IMMUTABLE', 403);
    this.name = 'AuditImmutabilityError';
  }
}

/**
 * Utility function to determine if an error is an audit-related error
 */
export const isAuditError = (error: unknown): error is AuditError => {
  return error instanceof AuditError;
};

/**
 * Extract error information for logging
 */
export const extractErrorInfo = (error: unknown) => {
  if (isAuditError(error)) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  return {
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : 'Unknown error',
    statusCode: 500,
  };
};

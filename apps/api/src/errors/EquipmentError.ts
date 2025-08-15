/**
 * Domain-specific error classes for equipment operations
 * Provides specific error types for better error handling and consistent HTTP responses
 */

export class EquipmentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'EquipmentError';
    this.code = code;
    this.statusCode = statusCode;

    // Set prototype explicitly to ensure instanceof checks work after transpilation
    Object.setPrototypeOf(this, EquipmentError.prototype);

    // Maintains proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EquipmentError);
    }
  }
}

export class EquipmentNotFoundError extends EquipmentError {
  constructor(equipmentId: string) {
    super(`Equipment with ID '${equipmentId}' not found`, 'EQUIPMENT_NOT_FOUND', 404);
    this.name = 'EquipmentNotFoundError';
  }
}

export class EquipmentValidationError extends EquipmentError {
  constructor(message: string) {
    super(message, 'EQUIPMENT_VALIDATION_ERROR', 400);
    this.name = 'EquipmentValidationError';
  }
}

export class EquipmentPermissionError extends EquipmentError {
  constructor(message: string = 'Insufficient permissions for equipment operation') {
    super(message, 'EQUIPMENT_PERMISSION_DENIED', 403);
    this.name = 'EquipmentPermissionError';
  }
}

export class EquipmentConflictError extends EquipmentError {
  constructor(message: string) {
    super(message, 'EQUIPMENT_CONFLICT', 409);
    this.name = 'EquipmentConflictError';
  }
}

export class OptimisticLockingError extends EquipmentError {
  constructor(
    message: string = 'Equipment was modified by another user. Please refresh and try again.'
  ) {
    super(message, 'OPTIMISTIC_LOCKING_ERROR', 409);
    this.name = 'OptimisticLockingError';
  }
}

/**
 * Utility function to determine if an error is an equipment-related error
 */
export const isEquipmentError = (error: unknown): error is EquipmentError => {
  return error instanceof EquipmentError;
};

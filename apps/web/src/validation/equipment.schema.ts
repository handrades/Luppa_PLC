/**
 * Equipment Form Validation Schemas for Story 4.4
 * Comprehensive Zod validation schemas for equipment creation and editing
 */

import { z } from 'zod';
import { EquipmentType } from '../types/equipment';
import { EQUIPMENT_FORM_CONSTRAINTS } from '../types/equipment-form';

/**
 * Base schema for common equipment fields
 */
const baseEquipmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Equipment name is required')
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.NAME_MAX_LENGTH,
      `Name must be less than ${EQUIPMENT_FORM_CONSTRAINTS.NAME_MAX_LENGTH} characters`
    )
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .trim(),

  equipmentType: z.nativeEnum(EquipmentType, {
    message: 'Please select a valid equipment type',
  }),

  cellId: z.string().uuid('Please select a valid cell').min(1, 'Cell selection is required'),
});

/**
 * Extended schema for PLC details
 */
const plcDetailsSchema = z.object({
  tagId: z
    .string()
    .min(1, 'Tag ID is required')
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.TAG_ID_MAX_LENGTH,
      `Tag ID must be less than ${EQUIPMENT_FORM_CONSTRAINTS.TAG_ID_MAX_LENGTH} characters`
    )
    .regex(/^[a-zA-Z0-9_]+$/, 'Tag ID can only contain letters, numbers, and underscores')
    .trim(),

  description: z
    .string()
    .min(1, 'Description is required')
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${EQUIPMENT_FORM_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`
    )
    .trim(),

  make: z
    .string()
    .min(1, 'Make is required')
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.MAKE_MAX_LENGTH,
      `Make must be less than ${EQUIPMENT_FORM_CONSTRAINTS.MAKE_MAX_LENGTH} characters`
    )
    .trim(),

  model: z
    .string()
    .min(1, 'Model is required')
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.MODEL_MAX_LENGTH,
      `Model must be less than ${EQUIPMENT_FORM_CONSTRAINTS.MODEL_MAX_LENGTH} characters`
    )
    .trim(),
});

/**
 * Optional network configuration schema
 */
const networkConfigSchema = z.object({
  ipAddress: z
    .union([
      z.literal(''),
      z
        .string()
        .regex(
          /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
          'Please enter a valid IPv4 address (e.g., 192.168.1.100)'
        ),
    ])
    .optional()
    .transform(val => (val === '' ? undefined : val)),

  firmwareVersion: z
    .union([
      z.literal(''),
      z
        .string()
        .max(
          EQUIPMENT_FORM_CONSTRAINTS.FIRMWARE_MAX_LENGTH,
          `Firmware version must be less than ${EQUIPMENT_FORM_CONSTRAINTS.FIRMWARE_MAX_LENGTH} characters`
        )
        .regex(/^[a-zA-Z0-9.\-_\s]+$/, 'Firmware version contains invalid characters'),
    ])
    .optional()
    .transform(val => (val === '' ? undefined : val)),
});

/**
 * Tags validation schema
 */
const tagsSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag cannot be empty')
        .max(
          EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH,
          `Tag must be less than ${EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH} characters`
        )
        .regex(
          /^[a-zA-Z0-9\-_]+$/,
          'Tag can only contain letters, numbers, hyphens, and underscores'
        )
        .trim()
    )
    .max(
      EQUIPMENT_FORM_CONSTRAINTS.MAX_TAGS,
      `Maximum ${EQUIPMENT_FORM_CONSTRAINTS.MAX_TAGS} tags allowed`
    )
    .refine(
      tags => {
        // Check for duplicate tags (case-insensitive)
        const lowercaseTags = tags.map(tag => tag.toLowerCase());
        return new Set(lowercaseTags).size === lowercaseTags.length;
      },
      {
        message: 'Duplicate tags are not allowed',
      }
    )
    .default([]),
});

/**
 * Complete form schema for equipment creation
 */
export const equipmentCreateSchema = baseEquipmentSchema
  .merge(plcDetailsSchema)
  .merge(networkConfigSchema)
  .merge(tagsSchema)
  .refine(
    data => {
      // Cross-field validation: If IP is provided, equipment type should support networking
      if (
        data.ipAddress &&
        ![EquipmentType.ROBOT, EquipmentType.CONVEYOR, EquipmentType.OTHER].includes(
          data.equipmentType
        )
      ) {
        return true; // Allow IP for all equipment types for now
      }
      return true;
    },
    {
      message: 'IP address configuration may not be supported for this equipment type',
      path: ['ipAddress'],
    }
  );

/**
 * Complete form schema for equipment updates (includes optimistic locking)
 */
export const equipmentUpdateSchema = equipmentCreateSchema.extend({
  updatedAt: z
    .string()
    .min(1, 'Updated timestamp is required for updates')
    .datetime('Invalid timestamp format - must be ISO datetime string'),
});

/**
 * Partial schema for field-level validation during form input
 */
export const equipmentFieldSchema = {
  name: baseEquipmentSchema.shape.name,
  equipmentType: baseEquipmentSchema.shape.equipmentType,
  cellId: baseEquipmentSchema.shape.cellId,
  tagId: plcDetailsSchema.shape.tagId,
  description: plcDetailsSchema.shape.description,
  make: plcDetailsSchema.shape.make,
  model: plcDetailsSchema.shape.model,
  ipAddress: networkConfigSchema.shape.ipAddress,
  firmwareVersion: networkConfigSchema.shape.firmwareVersion,
  tags: tagsSchema.shape.tags,
} as const;

/**
 * Schema for IP address uniqueness validation
 */
export const ipUniquenessSchema = z.object({
  ipAddress: z
    .string()
    .regex(
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Invalid IPv4 address format'
    ),
  excludeEquipmentId: z.string().uuid().optional(),
});

/**
 * Schema for site suggestions query
 */
export const siteSuggestionsSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long').trim(),
});

/**
 * Tag validation schema for individual tag input
 */
export const singleTagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(
    EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH,
    `Tag must be less than ${EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH} characters`
  )
  .regex(/^[a-zA-Z0-9\-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores')
  .trim();

/**
 * TypeScript type inference for form schemas
 */
export type EquipmentCreateFormData = z.infer<typeof equipmentCreateSchema>;
export type EquipmentUpdateFormData = z.infer<typeof equipmentUpdateSchema>;
export type EquipmentFieldValidation = {
  [K in keyof typeof equipmentFieldSchema]: z.infer<(typeof equipmentFieldSchema)[K]>;
};

/**
 * Validation error formatting utility
 */
export const formatValidationError = (error: z.ZodError): Record<string, string[]> => {
  const formattedErrors: Record<string, string[]> = {};

  error.issues.forEach(err => {
    const path = err.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });

  return formattedErrors;
};

/**
 * Async validation helper for IP uniqueness
 */
export const createIpUniquenessValidator = (
  checkUniqueness: (ip: string, excludeId?: string) => Promise<boolean>
) => {
  return async (ip: string, excludeEquipmentId?: string): Promise<string | undefined> => {
    const ipTrimmed = ip.trim();

    if (!ip || ipTrimmed === '') {
      return undefined; // IP is optional
    }

    // First validate format
    const formatResult = equipmentFieldSchema.ipAddress.safeParse(ipTrimmed);
    if (!formatResult.success) {
      return formatResult.error.issues[0]?.message || 'Invalid IP address format';
    }

    // Then check uniqueness
    try {
      const isUnique = await checkUniqueness(ipTrimmed, excludeEquipmentId);
      if (!isUnique) {
        return 'This IP address is already in use by another equipment';
      }
    } catch {
      return 'Unable to verify IP address uniqueness. Please try again.';
    }

    return undefined;
  };
};

/**
 * Form validation presets for different scenarios
 */
export const ValidationPresets = {
  /**
   * Minimal validation for draft saving
   */
  DRAFT: equipmentCreateSchema.partial(),

  /**
   * Step-by-step validation for multi-step forms
   */
  STEP_BASIC: baseEquipmentSchema,
  STEP_PLC: plcDetailsSchema,
  STEP_NETWORK: networkConfigSchema,
  STEP_TAGS: tagsSchema,

  /**
   * Quick validation for individual fields
   */
  FIELD: equipmentFieldSchema,
} as const;

/**
 * Custom validation messages for better UX
 */
export const ValidationMessages = {
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Please check the format of this field',
  TOO_LONG: 'This field is too long',
  TOO_SHORT: 'This field is too short',
  INVALID_CHARACTERS: 'This field contains invalid characters',
  DUPLICATE_IP: 'This IP address is already in use',
  DUPLICATE_TAG: 'Duplicate tags are not allowed',
  MAX_TAGS_EXCEEDED: `Maximum ${EQUIPMENT_FORM_CONSTRAINTS.MAX_TAGS} tags allowed`,
  NETWORK_ERROR: 'Network error occurred during validation',
  OPTIMISTIC_LOCK_CONFLICT:
    'This equipment has been modified by another user. Please refresh and try again.',
} as const;

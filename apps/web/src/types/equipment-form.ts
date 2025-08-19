/**
 * Equipment Form TypeScript interfaces for Story 4.4
 * Provides comprehensive type definitions for equipment creation and editing forms
 */

import { Equipment, EquipmentType, EquipmentWithDetails } from './equipment';

/**
 * Form mode enumeration to distinguish between create and edit operations
 */
export enum EquipmentFormMode {
  CREATE = 'create',
  EDIT = 'edit',
}

/**
 * Equipment form data structure matching API requirements
 * Used for both create and edit operations
 */
export interface EquipmentFormData {
  // Basic Information
  name: string;
  equipmentType: EquipmentType;
  cellId: string;

  // PLC Details
  tagId: string;
  description: string;
  make: string;
  model: string;

  // Network Configuration
  ipAddress?: string;
  firmwareVersion?: string;

  // Metadata
  tags: string[];

  // For optimistic locking (edit mode only)
  updatedAt?: string;
}

/**
 * Props interface for the main EquipmentForm component
 */
export interface EquipmentFormProps {
  mode: EquipmentFormMode;
  initialData?: EquipmentWithDetails;
  onSuccess: (equipment: Equipment) => void;
  onCancel: () => void;
  onOptimisticLockConflict?: (conflictInfo: OptimisticLockConflict) => void;
  isLoading?: boolean;
}

/**
 * Field-level validation errors structure
 */
export interface EquipmentFormErrors {
  name?: string[];
  equipmentType?: string[];
  cellId?: string[];
  siteId?: string[]; // For hierarchy validation
  tagId?: string[];
  description?: string[];
  make?: string[];
  model?: string[];
  ipAddress?: string[];
  firmwareVersion?: string[];
  tags?: string[];
  updatedAt?: string[];
  form?: string[]; // General form-level errors
}

/**
 * Site autocomplete option data structure
 */
export interface SiteAutocompleteOption {
  siteName: string;
  usageCount: number; // How many equipment records use this site
  label?: string; // Display label (computed from siteName + usageCount)
}

/**
 * Site autocomplete component props
 */
export interface SiteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

/**
 * Tag input value structure for tag management
 */
export interface TagInputValue {
  id: string; // Unique identifier for React keys
  value: string; // The actual tag text
  isValid: boolean; // Whether the tag passes validation
}

/**
 * Tag input component props
 */
export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  disabled?: boolean;
  maxTags?: number;
  placeholder?: string;
  label?: string;
}

/**
 * IP address input component props
 */
export interface IpAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
  excludeEquipmentId?: string; // For edit mode uniqueness checking
}

/**
 * Form field validation state
 */
export interface FieldValidationState {
  isValidating: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Auto-save hook return type
 */
export interface UseEquipmentFormAutoSaveReturn {
  isDraftSaved: boolean;
  lastSaveTime: Date | null;
  saveDraft: (data: EquipmentFormData) => void;
  clearDraft: () => void;
  loadDraft: () => EquipmentFormData | null;
  hasDraft: boolean;
}

/**
 * Form submission state
 */
export interface FormSubmissionState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submitError?: string;
}

/**
 * Optimistic locking conflict information
 */
export interface OptimisticLockConflict {
  current: EquipmentWithDetails;
  conflicting: EquipmentWithDetails;
}

/**
 * Equipment form validation context
 */
export interface EquipmentFormValidationContext {
  validateField: (fieldName: keyof EquipmentFormData, value: unknown) => Promise<boolean>;
  validateIpUniqueness: (ip: string, excludeId?: string) => Promise<boolean>;
  getFieldError: (fieldName: keyof EquipmentFormData) => string | undefined;
  clearFieldError: (fieldName: keyof EquipmentFormData) => void;
}

/**
 * Equipment create/update request data for API calls
 */
export interface EquipmentFormApiData {
  name: string;
  equipmentType: EquipmentType;
  cellId: string;
  tagId: string;
  description: string;
  make: string;
  model: string;
  ipAddress?: string;
  firmwareVersion?: string;
  tags?: string[];
  updatedAt?: string; // For optimistic locking in edit mode
}

/**
 * Form page props for create and edit pages
 */
export interface EquipmentFormPageProps {
  equipmentId?: string; // For edit mode
}

/**
 * Utility type for form field props with common form attributes
 */
export type FormFieldProps<T = string> = {
  value: T;
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
  helperText?: string;
};

/**
 * Utility type for validation schema inference
 */
export type ValidationSchemaType<T> = T extends { _output: infer O } ? O : never;

/**
 * Equipment form section identifiers for multi-step forms
 */
export enum EquipmentFormSection {
  BASIC_INFO = 'basicInfo',
  PLC_DETAILS = 'plcDetails',
  NETWORK_CONFIG = 'networkConfig',
  TAGS_METADATA = 'tagsMetadata',
}

/**
 * Form section configuration
 */
export interface FormSectionConfig {
  id: EquipmentFormSection;
  title: string;
  description: string;
  fields: (keyof EquipmentFormData)[];
  isRequired: boolean;
}

/**
 * Default values for equipment form
 */
export const EQUIPMENT_FORM_DEFAULTS: Partial<EquipmentFormData> = {
  tags: [],
  ipAddress: '',
  firmwareVersion: '',
};

/**
 * Form validation constants
 */
export const EQUIPMENT_FORM_CONSTRAINTS = {
  NAME_MAX_LENGTH: 100,
  TAG_ID_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  MAKE_MAX_LENGTH: 100,
  MODEL_MAX_LENGTH: 100,
  FIRMWARE_MAX_LENGTH: 50,
  TAG_MAX_LENGTH: 50,
  MAX_TAGS: 20,
  AUTOCOMPLETE_DEBOUNCE_MS: 300,
  VALIDATION_DEBOUNCE_MS: 500,
} as const;

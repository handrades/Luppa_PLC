/**
 * Filter Validation Hook
 * Story 5.1: Advanced Filtering System
 *
 * Hook for comprehensive filter validation with real-time feedback,
 * cross-field validation, and performance optimization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash-es';
import { validateAdvancedFilters } from '../validation/filter.schemas';
import { analyzeFilterComplexity } from '../utils/filter-performance.utils';
import type {
  AdvancedFilters,
  FilterValidationResult,
  IPRangeFilter,
  TagFilter,
} from '../types/advanced-filters';

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Field-specific validation result
 */
interface FieldValidation {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

/**
 * Validation context for cross-field validation
 */
interface ValidationContext {
  hasDateRange: boolean;
  hasIPFilter: boolean;
  hasTagFilter: boolean;
  hasMultipleSelects: boolean;
  complexityLevel: 'low' | 'medium' | 'high' | 'very-high';
}

/**
 * Validation options
 */
interface UseFilterValidationOptions {
  /**
   * Whether to validate on every change
   * @default true
   */
  validateOnChange?: boolean;

  /**
   * Debounce delay for validation in milliseconds
   * @default 300
   */
  debounceDelay?: number;

  /**
   * Whether to show warnings for suboptimal filters
   * @default true
   */
  enableWarnings?: boolean;

  /**
   * Whether to provide optimization suggestions
   * @default true
   */
  enableSuggestions?: boolean;

  /**
   * Custom validation rules
   */
  customValidators?: Record<
    string,
    (value: unknown, context: ValidationContext) => FieldValidation
  >;

  /**
   * Validation error handler
   */
  onValidationError?: (errors: Record<string, string>) => void;

  /**
   * Validation success handler
   */
  onValidationSuccess?: () => void;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useFilterValidation hook
 */
interface UseFilterValidationReturn {
  // Validation State
  isValid: boolean;
  isValidating: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;

  // Validation Results
  validation: FilterValidationResult;
  fieldValidations: Record<keyof AdvancedFilters, FieldValidation>;

  // Validation Operations
  validateFilters: (filters: AdvancedFilters) => FilterValidationResult;
  validateField: <K extends keyof AdvancedFilters>(
    field: K,
    value: AdvancedFilters[K],
    context?: Partial<AdvancedFilters>
  ) => FieldValidation;
  clearValidation: () => void;

  // Error Handling
  errors: Record<string, string>;
  warnings: Record<string, string>;
  suggestions: Record<string, string>;

  // Field-specific Validators
  validateSiteIds: (siteIds: string[]) => FieldValidation;
  validateDateRange: (after?: Date, before?: Date) => FieldValidation;
  validateIPRange: (ipRange: IPRangeFilter) => FieldValidation;
  validateTagFilter: (tagFilter: TagFilter) => FieldValidation;
  validateSearchQuery: (query: string) => FieldValidation;

  // Utility Functions
  getValidationSummary: () => string;
  getFirstError: () => string | null;
  getErrorsForField: (field: keyof AdvancedFilters) => string[];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validates IP address format
 */
const isValidIPAddress = (ip: string): boolean => {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

/**
 * Validates CIDR notation
 */
const isValidCIDR = (cidr: string): boolean => {
  const cidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidr);
};

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Filter Validation Hook
 *
 * Provides comprehensive filter validation with real-time feedback,
 * field-specific validation, and optimization suggestions.
 */
export const useFilterValidation = (
  filters: AdvancedFilters,
  options: UseFilterValidationOptions = {}
): UseFilterValidationReturn => {
  const {
    validateOnChange = true,
    debounceDelay = 300,
    enableWarnings = true,
    enableSuggestions = true,
    customValidators = {},
    onValidationError,
    onValidationSuccess,
  } = options;

  // State
  const [validation, setValidation] = useState<FilterValidationResult>({
    isValid: true,
    success: true,
    data: filters,
    fieldErrors: {},
    warnings: [],
    performanceWarnings: [],
  });
  const [isValidating, setIsValidating] = useState(false);
  const [fieldValidations, setFieldValidations] = useState<
    Record<keyof AdvancedFilters, FieldValidation>
  >({} as Record<keyof AdvancedFilters, FieldValidation>);

  // =============================================================================
  // VALIDATION CONTEXT
  // =============================================================================

  const validationContext = useMemo((): ValidationContext => {
    const complexity = analyzeFilterComplexity(filters);

    return {
      hasDateRange: !!(
        filters.createdAfter ||
        filters.createdBefore ||
        filters.updatedAfter ||
        filters.updatedBefore
      ),
      hasIPFilter: !!filters.ipRange,
      hasTagFilter: !!(filters.tagFilter?.include?.length || filters.tagFilter?.exclude?.length),
      hasMultipleSelects:
        [
          filters.siteIds,
          filters.cellTypes,
          filters.equipmentTypes,
          filters.makes,
          filters.models,
        ].filter(arr => arr && arr.length > 0).length > 1,
      complexityLevel: complexity.level,
    };
  }, [filters]);

  // =============================================================================
  // FIELD-SPECIFIC VALIDATORS
  // =============================================================================

  /**
   * Validates site IDs
   */
  const validateSiteIds = useCallback(
    (siteIds: string[]): FieldValidation => {
      if (!siteIds || siteIds.length === 0) {
        return { isValid: true };
      }

      if (siteIds.length > 50) {
        return {
          isValid: false,
          error: 'Too many sites selected (maximum 50)',
          suggestion: 'Consider using site categories or regions instead',
        };
      }

      if (enableWarnings && siteIds.length > 10) {
        return {
          isValid: true,
          warning: 'Large number of sites may impact performance',
          suggestion: 'Consider creating a preset for frequently used site combinations',
        };
      }

      return { isValid: true };
    },
    [enableWarnings]
  );

  /**
   * Validates date range
   */
  const validateDateRange = useCallback((after?: Date, before?: Date): FieldValidation => {
    if (!after && !before) {
      return { isValid: true };
    }

    if (after && before && after >= before) {
      return {
        isValid: false,
        error: 'Start date must be before end date',
      };
    }

    if (after && after > new Date()) {
      return {
        isValid: false,
        error: 'Start date cannot be in the future',
      };
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (after && before) {
      const daysDiff = Math.abs(before.getTime() - after.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 365) {
        return {
          isValid: true,
          warning: 'Date range spans more than one year',
          suggestion: 'Large date ranges may impact query performance',
        };
      }
    }

    return { isValid: true };
  }, []);

  /**
   * Validates IP range
   */
  const validateIPRange = useCallback(
    (ipRange: IPRangeFilter): FieldValidation => {
      if (!ipRange) {
        return { isValid: true };
      }

      if (ipRange.cidr) {
        if (!isValidCIDR(ipRange.cidr)) {
          return {
            isValid: false,
            error: 'Invalid CIDR notation format',
            suggestion: 'Use format like 192.168.1.0/24',
          };
        }

        const [, prefix] = ipRange.cidr.split('/');
        const prefixNum = parseInt(prefix, 10);

        if (prefixNum < 8) {
          return {
            isValid: true,
            warning: 'Very broad IP range may affect performance',
            suggestion: 'Consider using more specific subnets',
          };
        }
      } else if (ipRange.startIP && ipRange.endIP) {
        if (!isValidIPAddress(ipRange.startIP)) {
          return {
            isValid: false,
            error: 'Invalid start IP address format',
          };
        }

        if (!isValidIPAddress(ipRange.endIP)) {
          return {
            isValid: false,
            error: 'Invalid end IP address format',
          };
        }

        // Convert IPs to numbers for comparison
        const ipToNum = (ip: string) =>
          ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

        if (ipToNum(ipRange.startIP) >= ipToNum(ipRange.endIP)) {
          return {
            isValid: false,
            error: 'Start IP must be less than end IP',
          };
        }

        if (enableSuggestions) {
          return {
            isValid: true,
            suggestion: 'CIDR notation is more efficient than IP ranges',
          };
        }
      }

      return { isValid: true };
    },
    [enableSuggestions]
  );

  /**
   * Validates tag filter
   */
  const validateTagFilter = useCallback(
    (tagFilter: TagFilter): FieldValidation => {
      if (!tagFilter) {
        return { isValid: true };
      }

      const { include, exclude } = tagFilter;

      if ((!include || include.length === 0) && (!exclude || exclude.length === 0)) {
        return { isValid: true };
      }

      const totalTags = (include?.length || 0) + (exclude?.length || 0);

      if (totalTags > 20) {
        return {
          isValid: false,
          error: 'Too many tags (maximum 20 total)',
          suggestion: 'Consider using tag categories or hierarchies',
        };
      }

      if (include && exclude) {
        const duplicates = include.filter(tag => exclude.includes(tag));
        if (duplicates.length > 0) {
          return {
            isValid: false,
            error: `Tags cannot be both included and excluded: ${duplicates.join(', ')}`,
          };
        }
      }

      if (enableWarnings && totalTags > 10) {
        return {
          isValid: true,
          warning: 'Large number of tags may impact performance',
          suggestion: 'Consider using tag presets for complex tag combinations',
        };
      }

      return { isValid: true };
    },
    [enableWarnings]
  );

  /**
   * Validates search query
   */
  const validateSearchQuery = useCallback(
    (query: string): FieldValidation => {
      if (!query || query.trim() === '') {
        return { isValid: true };
      }

      const trimmedQuery = query.trim();

      if (trimmedQuery.length < 2) {
        return {
          isValid: false,
          error: 'Search query must be at least 2 characters',
        };
      }

      if (trimmedQuery.length > 500) {
        return {
          isValid: false,
          error: 'Search query is too long (maximum 500 characters)',
        };
      }

      // Check for potentially problematic patterns
      const problematicPatterns = [
        /[<>]/g, // HTML-like tags
        /script/gi, // Script tags
        /javascript:/gi, // JavaScript URLs
        /on\w+=/gi, // Event handlers
      ];

      if (problematicPatterns.some(pattern => pattern.test(trimmedQuery))) {
        return {
          isValid: false,
          error: 'Search query contains invalid characters or patterns',
        };
      }

      if (enableWarnings && trimmedQuery.length > 100) {
        return {
          isValid: true,
          warning: 'Long search queries may impact performance',
          suggestion: 'Consider using specific filters instead of broad search terms',
        };
      }

      return { isValid: true };
    },
    [enableWarnings]
  );

  // =============================================================================
  // MAIN VALIDATION FUNCTIONS
  // =============================================================================

  /**
   * Validates a single field
   */
  const validateField = useCallback(
    <K extends keyof AdvancedFilters>(
      field: K,
      value: AdvancedFilters[K],
      context?: Partial<AdvancedFilters>
    ): FieldValidation => {
      const fullContext = { ...filters, ...context };

      // Apply custom validator if available
      if (customValidators[field as string]) {
        return customValidators[field as string](value, validationContext);
      }

      // Apply built-in validators
      switch (field) {
        case 'siteIds':
          return validateSiteIds(value as string[]);

        case 'createdAfter':
        case 'createdBefore':
          return validateDateRange(
            field === 'createdAfter' ? (value as Date) : fullContext.createdAfter,
            field === 'createdBefore' ? (value as Date) : fullContext.createdBefore
          );

        case 'updatedAfter':
        case 'updatedBefore':
          return validateDateRange(
            field === 'updatedAfter' ? (value as Date) : fullContext.updatedAfter,
            field === 'updatedBefore' ? (value as Date) : fullContext.updatedBefore
          );

        case 'ipRange':
          return validateIPRange(value as IPRangeFilter);

        case 'tagFilter':
          return validateTagFilter(value as TagFilter);

        case 'searchQuery':
          return validateSearchQuery(value as string);

        default:
          return { isValid: true };
      }
    },
    [
      filters,
      customValidators,
      validationContext,
      validateSiteIds,
      validateDateRange,
      validateIPRange,
      validateTagFilter,
      validateSearchQuery,
    ]
  );

  /**
   * Validates all filters
   */
  const validateFilters = useCallback(
    (filtersToValidate: AdvancedFilters): FilterValidationResult => {
      setIsValidating(true);

      try {
        // Use Zod schema validation first
        const schemaValidation = validateAdvancedFilters(filtersToValidate);

        // Perform additional field-specific validation
        const newFieldValidations: Record<keyof AdvancedFilters, FieldValidation> = {} as Record<
          keyof AdvancedFilters,
          FieldValidation
        >;
        let hasErrors = false;

        // Validate each field
        (Object.keys(filtersToValidate) as Array<keyof AdvancedFilters>).forEach(field => {
          const fieldValidation = validateField(field, filtersToValidate[field], filtersToValidate);
          newFieldValidations[field] = fieldValidation;

          if (!fieldValidation.isValid) {
            hasErrors = true;
          }
        });

        setFieldValidations(newFieldValidations);

        const result: FilterValidationResult = {
          isValid: schemaValidation.success && !hasErrors,
          success: schemaValidation.success && !hasErrors,
          data: schemaValidation.success ? schemaValidation.data : undefined,
          fieldErrors: {
            ...(schemaValidation.fieldErrors
              ? Object.fromEntries(
                  Object.entries(schemaValidation.fieldErrors).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.join(', ') : String(value),
                  ])
                )
              : {}),
            ...Object.fromEntries(
              Object.entries(newFieldValidations)
                .filter(([, validation]) => validation.error)
                .map(([field, validation]) => [field, validation.error!])
            ),
          },
          warnings: schemaValidation.warnings || [],
          performanceWarnings: schemaValidation.warnings || [],
        };

        setValidation(result);

        if (result.success) {
          onValidationSuccess?.();
        } else {
          onValidationError?.(result.fieldErrors);
        }

        return result;
      } finally {
        setIsValidating(false);
      }
    },
    [validateField, onValidationSuccess, onValidationError]
  );

  /**
   * Debounced validation function
   */
  const debouncedValidate = useMemo(
    () => debounce(validateFilters, debounceDelay),
    [validateFilters, debounceDelay]
  );

  /**
   * Clears validation state
   */
  const clearValidation = useCallback(() => {
    setValidation({
      isValid: true,
      success: true,
      data: filters,
      fieldErrors: {},
      warnings: [],
      performanceWarnings: [],
    });
    setFieldValidations({} as Record<keyof AdvancedFilters, FieldValidation>);
  }, [filters]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const isValid = useMemo(() => validation.isValid, [validation.isValid]);

  const hasErrors = useMemo(
    () => Object.keys(validation.fieldErrors).length > 0,
    [validation.fieldErrors]
  );

  const hasWarnings = useMemo(
    () => Object.values(fieldValidations).some(v => v.warning),
    [fieldValidations]
  );

  const errors = useMemo(() => validation.fieldErrors, [validation.fieldErrors]);

  const warnings = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(fieldValidations)
          .filter(([, validation]) => validation.warning)
          .map(([field, validation]) => [field, validation.warning!])
      ),
    [fieldValidations]
  );

  const suggestions = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(fieldValidations)
          .filter(([, validation]) => validation.suggestion)
          .map(([field, validation]) => [field, validation.suggestion!])
      ),
    [fieldValidations]
  );

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getValidationSummary = useCallback((): string => {
    const errorCount = Object.keys(errors).length;
    const warningCount = Object.keys(warnings).length;

    if (errorCount > 0) {
      return `${errorCount} error${errorCount > 1 ? 's' : ''} found`;
    }

    if (warningCount > 0) {
      return `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    }

    return 'All filters are valid';
  }, [errors, warnings]);

  const getFirstError = useCallback((): string | null => {
    const errorEntries = Object.entries(errors);
    return errorEntries.length > 0 ? errorEntries[0][1] : null;
  }, [errors]);

  const getErrorsForField = useCallback(
    (field: keyof AdvancedFilters): string[] => {
      const fieldErrors: string[] = [];

      if (errors[field as string]) {
        fieldErrors.push(errors[field as string]);
      }

      const fieldValidation = fieldValidations[field];
      if (fieldValidation?.error && fieldValidation.error !== errors[field as string]) {
        fieldErrors.push(fieldValidation.error);
      }

      return fieldErrors;
    },
    [errors, fieldValidations]
  );

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Auto-validate on filter changes
   */
  useEffect(() => {
    if (validateOnChange) {
      debouncedValidate(filters);
    }

    return () => {
      debouncedValidate.cancel();
    };
  }, [filters, validateOnChange, debouncedValidate]);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // Validation State
    isValid,
    isValidating,
    hasErrors,
    hasWarnings,

    // Validation Results
    validation,
    fieldValidations,

    // Validation Operations
    validateFilters,
    validateField,
    clearValidation,

    // Error Handling
    errors,
    warnings,
    suggestions,

    // Field-specific Validators
    validateSiteIds,
    validateDateRange,
    validateIPRange,
    validateTagFilter,
    validateSearchQuery,

    // Utility Functions
    getValidationSummary,
    getFirstError,
    getErrorsForField,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Simplified validation hook for basic validation
 */
export const useSimpleValidation = (filters: AdvancedFilters) => {
  return useFilterValidation(filters, {
    validateOnChange: false,
    enableWarnings: false,
    enableSuggestions: false,
  });
};

/**
 * Real-time validation hook with immediate feedback
 */
export const useRealtimeValidation = (
  filters: AdvancedFilters,
  onError?: (errors: Record<string, string>) => void
) => {
  return useFilterValidation(filters, {
    validateOnChange: true,
    debounceDelay: 100,
    onValidationError: onError,
  });
};

/**
 * Filter URL Synchronization Utilities
 * Story 5.1: Advanced Filtering System
 *
 * Utilities for synchronizing filter state with URL parameters,
 * enabling shareable links and browser navigation.
 */

import type { AdvancedFilters } from '../types/advanced-filters';
// import type { FilterPreset } from '../types/advanced-filters';
import { validateAdvancedFilters } from '../validation/filter.schemas';

// =============================================================================
// URL PARAMETER CONSTANTS
// =============================================================================

/**
 * URL parameter keys for filter state
 */
export const URL_PARAMS = {
  FILTERS: 'f',
  PRESET: 'p',
  VERSION: 'v',
} as const;

/**
 * Current URL parameter version for backward compatibility
 */
export const CURRENT_VERSION = '1.0';

/**
 * Maximum URL length to prevent browser issues
 */
export const MAX_URL_LENGTH = 2048;

// =============================================================================
// SERIALIZATION UTILITIES
// =============================================================================

/**
 * Serializes filter state to compressed URL parameter string
 */
export const serializeFiltersToURL = (filters: AdvancedFilters): string => {
  try {
    // Remove default/empty values to reduce URL length
    const cleanFilters = cleanEmptyFilters(filters);

    if (Object.keys(cleanFilters).length === 0) {
      return '';
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(cleanFilters);

    // Compress using simple base64 encoding
    const compressed = btoa(jsonString);

    return compressed;
  } catch (error) {
    console.warn('Failed to serialize filters to URL:', error);
    return '';
  }
};

/**
 * Deserializes URL parameter string back to filter state
 */
export const deserializeFiltersFromURL = (urlParam: string): AdvancedFilters | null => {
  try {
    if (!urlParam) {
      return null;
    }

    // Decompress from base64
    const decompressed = atob(urlParam);

    // Parse JSON
    const parsed = JSON.parse(decompressed);

    // Validate the parsed filters
    const validation = validateAdvancedFilters(parsed);

    if (validation.success) {
      return validation.data!;
    } else {
      console.warn('Invalid filters from URL:', validation.fieldErrors);
      return null;
    }
  } catch (error) {
    console.warn('Failed to deserialize filters from URL:', error);
    return null;
  }
};

/**
 * Removes empty/default values from filters to minimize URL size
 */
const cleanEmptyFilters = (filters: AdvancedFilters): Partial<AdvancedFilters> => {
  const cleaned: Partial<AdvancedFilters> = {};

  // Only include non-empty arrays
  if (filters.siteIds?.length) cleaned.siteIds = filters.siteIds;
  if (filters.cellTypes?.length) cleaned.cellTypes = filters.cellTypes;
  if (filters.equipmentTypes?.length) cleaned.equipmentTypes = filters.equipmentTypes;
  if (filters.makes?.length) cleaned.makes = filters.makes;
  if (filters.models?.length) cleaned.models = filters.models;

  // Only include set dates
  if (filters.createdAfter) cleaned.createdAfter = filters.createdAfter;
  if (filters.createdBefore) cleaned.createdBefore = filters.createdBefore;
  if (filters.updatedAfter) cleaned.updatedAfter = filters.updatedAfter;
  if (filters.updatedBefore) cleaned.updatedBefore = filters.updatedBefore;

  // Only include IP range if configured
  if (filters.ipRange) {
    const { cidr, startIP, endIP } = filters.ipRange;
    if (cidr || (startIP && endIP)) {
      cleaned.ipRange = filters.ipRange;
    }
  }

  // Only include tag filter if configured
  if (filters.tagFilter) {
    const { include, exclude } = filters.tagFilter;
    if (include?.length || exclude?.length) {
      cleaned.tagFilter = filters.tagFilter;
    }
  }

  // Only include search query if non-empty
  if (filters.searchQuery?.trim()) cleaned.searchQuery = filters.searchQuery.trim();
  if (filters.searchFields?.length) cleaned.searchFields = filters.searchFields;

  // Always include pagination if non-default
  if (filters.page && filters.page !== 1) cleaned.page = filters.page;
  if (filters.pageSize && filters.pageSize !== 50) cleaned.pageSize = filters.pageSize;
  if (filters.sortBy && filters.sortBy !== 'name') cleaned.sortBy = filters.sortBy;
  if (filters.sortOrder && filters.sortOrder !== 'asc') cleaned.sortOrder = filters.sortOrder;

  return cleaned;
};

// =============================================================================
// URL MANAGEMENT
// =============================================================================

/**
 * Gets current URL with updated filter parameters
 */
export const generateFilterURL = (
  filters: AdvancedFilters,
  presetId?: string,
  baseUrl?: string
): string => {
  const url = new URL(baseUrl || window.location.href);

  // Clear existing filter parameters
  url.searchParams.delete(URL_PARAMS.FILTERS);
  url.searchParams.delete(URL_PARAMS.PRESET);
  url.searchParams.delete(URL_PARAMS.VERSION);

  if (presetId) {
    // If using preset, only store preset ID
    url.searchParams.set(URL_PARAMS.PRESET, presetId);
  } else {
    // Serialize filters to URL
    const serialized = serializeFiltersToURL(filters);
    if (serialized) {
      url.searchParams.set(URL_PARAMS.FILTERS, serialized);
      url.searchParams.set(URL_PARAMS.VERSION, CURRENT_VERSION);
    }
  }

  const finalUrl = url.toString();

  // Check URL length limit
  if (finalUrl.length > MAX_URL_LENGTH) {
    console.warn(`Generated URL exceeds maximum length (${finalUrl.length}/${MAX_URL_LENGTH})`);
    // Fallback to preset-only or no filters
    url.searchParams.delete(URL_PARAMS.FILTERS);
    if (!presetId) {
      url.searchParams.delete(URL_PARAMS.VERSION);
    }
  }

  return url.toString();
};

/**
 * Parses filter state from current URL
 */
export const parseFiltersFromURL = (
  url?: string
): {
  filters: AdvancedFilters | null;
  presetId: string | null;
  version: string | null;
} => {
  const urlObj = new URL(url || window.location.href);

  const filtersParam = urlObj.searchParams.get(URL_PARAMS.FILTERS);
  const presetParam = urlObj.searchParams.get(URL_PARAMS.PRESET);
  const versionParam = urlObj.searchParams.get(URL_PARAMS.VERSION);

  return {
    filters: filtersParam ? deserializeFiltersFromURL(filtersParam) : null,
    presetId: presetParam,
    version: versionParam,
  };
};

/**
 * Updates browser URL without triggering page reload
 */
export const updateBrowserURL = (
  filters: AdvancedFilters,
  presetId?: string,
  replace = true
): void => {
  try {
    const newUrl = generateFilterURL(filters, presetId);

    if (replace) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  } catch (error) {
    console.warn('Failed to update browser URL:', error);
  }
};

// =============================================================================
// SHAREABLE LINKS
// =============================================================================

/**
 * Generates a shareable link for current filters
 */
export const generateShareableLink = (
  filters: AdvancedFilters,
  presetId?: string,
  options?: {
    includeHost?: boolean;
    customPath?: string;
  }
): string => {
  const { includeHost = true, customPath } = options || {};

  let baseUrl;
  if (includeHost) {
    baseUrl = `${window.location.protocol}//${window.location.host}${customPath || window.location.pathname}`;
  } else {
    baseUrl = customPath || window.location.pathname;
  }

  return generateFilterURL(filters, presetId, baseUrl);
};

/**
 * Copies shareable link to clipboard
 */
export const copyShareableLinkToClipboard = async (
  filters: AdvancedFilters,
  presetId?: string,
  options?: {
    includeHost?: boolean;
    customPath?: string;
  }
): Promise<boolean> => {
  try {
    const shareableLink = generateShareableLink(filters, presetId, options);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareableLink);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }

    return true;
  } catch (error) {
    console.error('Failed to copy shareable link:', error);
    return false;
  }
};

// =============================================================================
// QR CODE GENERATION
// =============================================================================

/**
 * Generates QR code data URL for mobile sharing
 * Note: This is a simple implementation. For production, consider using a QR code library
 */
export const generateQRCodeDataURL = async (
  filters: AdvancedFilters,
  presetId?: string,
  size = 200
): Promise<string | null> => {
  try {
    /* const shareableLink = */ generateShareableLink(filters, presetId);

    // This is a placeholder implementation
    // In a real implementation, you would use a QR code library like 'qrcode'
    // For now, return a data URL that represents a QR code placeholder
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Simple placeholder - draw a square with text
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, size, size);

      ctx.fillStyle = '#000000';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', size / 2, size / 2 - 10);
      ctx.fillText('Placeholder', size / 2, size / 2 + 10);
      ctx.font = '8px monospace';
      ctx.fillText('Use QR library', size / 2, size / 2 + 25);

      return canvas.toDataURL();
    }

    return null;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return null;
  }
};

// =============================================================================
// BOOKMARK DETECTION
// =============================================================================

/**
 * Detects if current URL appears to be a bookmarked filter configuration
 */
export const isBookmarkedFilter = (): boolean => {
  const { filters, presetId } = parseFiltersFromURL();
  return !!(filters || presetId);
};

/**
 * Suggests creating a preset from bookmarked filters
 */
export const suggestPresetFromBookmark = (): {
  shouldSuggest: boolean;
  filters: AdvancedFilters | null;
  suggestedName: string;
} => {
  const { filters } = parseFiltersFromURL();

  if (!filters) {
    return {
      shouldSuggest: false,
      filters: null,
      suggestedName: '',
    };
  }

  // Generate a suggested name based on active filters
  const nameParts: string[] = [];

  if (filters.siteIds?.length === 1) {
    nameParts.push('Site Filter');
  } else if (filters.siteIds?.length) {
    nameParts.push('Multi-Site Filter');
  }

  if (filters.equipmentTypes?.length === 1) {
    nameParts.push(filters.equipmentTypes[0]);
  } else if (filters.equipmentTypes?.length) {
    nameParts.push('Multi-Type Filter');
  }

  if (filters.tagFilter?.include?.length) {
    nameParts.push('Tagged Equipment');
  }

  if (filters.createdAfter || filters.createdBefore) {
    nameParts.push('Date Filtered');
  }

  const suggestedName = nameParts.length > 0 ? nameParts.join(' - ') : 'Custom Filter';

  return {
    shouldSuggest: true,
    filters,
    suggestedName,
  };
};

// =============================================================================
// VERSION COMPATIBILITY
// =============================================================================

/**
 * Migrates filters from older URL parameter versions
 */
export const migrateFilterVersion = (
  filters: Record<string, unknown>,
  fromVersion: string
): AdvancedFilters => {
  // Currently only version 1.0, but this handles future migrations
  switch (fromVersion) {
    case '1.0':
    default:
      return filters as AdvancedFilters;
  }
};

/**
 * Validates URL parameter version compatibility
 */
export const isVersionCompatible = (version: string | null): boolean => {
  if (!version) return true; // No version means current

  const supportedVersions = ['1.0'];
  return supportedVersions.includes(version);
};

// =============================================================================
// URL PARAMETER ENCRYPTION (for sensitive filters)
// =============================================================================

/**
 * Simple encryption for sensitive filter parameters
 * Note: This is a basic XOR cipher for demonstration.
 * For production, use proper encryption libraries.
 */
const ENCRYPTION_KEY = 'filter-key-2024';

/**
 * Encrypts sensitive filter data
 */
export const encryptFilterData = (data: string): string => {
  try {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      const dataChar = data.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    return btoa(encrypted);
  } catch (error) {
    console.warn('Failed to encrypt filter data:', error);
    return data;
  }
};

/**
 * Decrypts sensitive filter data
 */
export const decryptFilterData = (encryptedData: string): string => {
  try {
    const data = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < data.length; i++) {
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      const dataChar = data.charCodeAt(i);
      decrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    return decrypted;
  } catch (error) {
    console.warn('Failed to decrypt filter data:', error);
    return encryptedData;
  }
};

/**
 * Determines if filters contain sensitive data that should be encrypted
 */
export const containsSensitiveData = (filters: AdvancedFilters): boolean => {
  // Define criteria for sensitive data
  return !!(
    filters.ipRange?.cidr ||
    filters.ipRange?.startIP ||
    filters.ipRange?.endIP ||
    filters.searchQuery?.toLowerCase().includes('password') ||
    filters.searchQuery?.toLowerCase().includes('secret')
  );
};

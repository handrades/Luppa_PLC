/**
 * Filter URL Synchronization Hook
 * Story 5.1: Advanced Filtering System
 *
 * Hook for synchronizing filter state with URL parameters,
 * enabling shareable links, bookmarks, and browser navigation.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  copyShareableLinkToClipboard,
  deserializeFiltersFromURL,
  generateFilterURL,
  generateQRCodeDataURL,
  generateShareableLink,
  isBookmarkedFilter,
  isVersionCompatible,
  migrateFilterVersion,
  parseFiltersFromURL,
  serializeFiltersToURL,
  suggestPresetFromBookmark,
  updateBrowserURL,
} from '../utils/filter-url.utils';
import type { AdvancedFilters } from '../types/advanced-filters';

// =============================================================================
// URL SYNC CONFIGURATION
// =============================================================================

/**
 * URL synchronization configuration
 */
interface FilterURLConfig {
  syncEnabled: boolean;
  debounceDelay: number;
  maxURLLength: number;
  enableHistory: boolean;
  enableBookmarkDetection: boolean;
  enableQRCodeGeneration: boolean;
  compressionEnabled: boolean;
  encryptSensitiveData: boolean;
}

/**
 * Default URL configuration
 */
const DEFAULT_CONFIG: FilterURLConfig = {
  syncEnabled: true,
  debounceDelay: 500,
  maxURLLength: 2048,
  enableHistory: true,
  enableBookmarkDetection: true,
  enableQRCodeGeneration: true,
  compressionEnabled: true,
  encryptSensitiveData: false,
};

// =============================================================================
// HOOK OPTIONS
// =============================================================================

/**
 * Options for configuring the useFilterURL hook
 */
interface UseFilterURLOptions {
  /**
   * URL configuration overrides
   */
  config?: Partial<FilterURLConfig>;

  /**
   * Whether to automatically sync filters with URL on mount
   * @default true
   */
  autoSync?: boolean;

  /**
   * Whether to replace or push URL changes to history
   * @default true (replace)
   */
  replaceHistory?: boolean;

  /**
   * Custom base path for filter URLs
   */
  basePath?: string;

  /**
   * URL change handler
   */
  onURLChange?: (filters: AdvancedFilters | null, presetId: string | null) => void;

  /**
   * Bookmark detection handler
   */
  onBookmarkDetected?: (suggestion: {
    shouldSuggest: boolean;
    filters: AdvancedFilters | null;
    suggestedName: string;
  }) => void;

  /**
   * Share handler
   */
  onShare?: (url: string, method: 'link' | 'qr' | 'clipboard') => void;

  /**
   * Error handler
   */
  onError?: (error: string, context: string) => void;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Return type for the useFilterURL hook
 */
interface UseFilterURLReturn {
  // URL State
  isURLSyncEnabled: boolean;
  currentURL: string;
  hasURLFilters: boolean;
  urlFilters: AdvancedFilters | null;
  urlPresetId: string | null;

  // URL Operations
  syncFiltersToURL: (filters: AdvancedFilters, presetId?: string) => void;
  loadFiltersFromURL: () => {
    filters: AdvancedFilters | null;
    presetId: string | null;
  };
  clearURLFilters: () => void;

  // Sharing Operations
  generateShareLink: (
    filters: AdvancedFilters,
    presetId?: string,
    options?: { includeHost?: boolean; customPath?: string }
  ) => string;
  copyShareLink: (
    filters: AdvancedFilters,
    presetId?: string,
    options?: { includeHost?: boolean; customPath?: string }
  ) => Promise<boolean>;
  generateQRCode: (
    filters: AdvancedFilters,
    presetId?: string,
    size?: number
  ) => Promise<string | null>;

  // Navigation Operations
  navigateWithFilters: (filters: AdvancedFilters, presetId?: string, replace?: boolean) => void;
  navigateToPath: (path: string, filters?: AdvancedFilters) => void;

  // Bookmark Operations
  isBookmarked: boolean;
  bookmarkSuggestion: {
    shouldSuggest: boolean;
    filters: AdvancedFilters | null;
    suggestedName: string;
  };

  // History Operations
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  getFilterHistory: () => Array<{
    filters: AdvancedFilters;
    presetId?: string;
    timestamp: Date;
    url: string;
  }>;

  // URL Validation
  validateURL: (url: string) => {
    isValid: boolean;
    filters: AdvancedFilters | null;
    presetId: string | null;
    version: string | null;
    warnings: string[];
  };

  // URL Utilities
  getURLSize: () => number;
  isURLTooLong: () => boolean;
  compressURL: (filters: AdvancedFilters) => string;
  decompressURL: (urlParam: string) => AdvancedFilters | null;

  // Configuration
  updateConfig: (config: Partial<FilterURLConfig>) => void;
  enableSync: () => void;
  disableSync: () => void;
}

// =============================================================================
// MAIN HOOK IMPLEMENTATION
// =============================================================================

/**
 * Filter URL Synchronization Hook
 *
 * Provides comprehensive URL synchronization for filter state,
 * including sharing, bookmarking, navigation, and history management.
 */
export const useFilterURL = (options: UseFilterURLOptions = {}): UseFilterURLReturn => {
  const {
    config = {},
    autoSync = true,
    replaceHistory = true,
    basePath,
    onURLChange,
    onBookmarkDetected,
    onShare,
    onError,
  } = options;

  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [currentConfig, setCurrentConfig] = useState(finalConfig);
  const [filterHistory, setFilterHistory] = useState<
    Array<{
      filters: AdvancedFilters;
      presetId?: string;
      timestamp: Date;
      url: string;
    }>
  >([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs for debouncing
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // =============================================================================
  // URL STATE PARSING
  // =============================================================================

  /**
   * Current URL filters and preset
   */
  const { urlFilters, urlPresetId } = useMemo(() => {
    try {
      const parsed = parseFiltersFromURL(location.search);

      // Handle version compatibility
      if (parsed.version && !isVersionCompatible(parsed.version)) {
        onError?.('URL contains unsupported filter version', 'version_compatibility');
        return { urlFilters: null, urlPresetId: null };
      }

      // Migrate if needed
      let filters = parsed.filters;
      if (filters && parsed.version && parsed.version !== '1.0') {
        filters = migrateFilterVersion(
          filters as Record<string, unknown>,
          parsed.version
        ) as AdvancedFilters;
      }

      return {
        urlFilters: filters,
        urlPresetId: parsed.presetId,
      };
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to parse URL filters',
        'url_parsing'
      );
      return { urlFilters: null, urlPresetId: null };
    }
  }, [location.search, onError]);

  /**
   * Current URL
   */
  const currentURL = useMemo(() => window.location.href, []);

  /**
   * Whether URL contains filter parameters
   */
  const hasURLFilters = useMemo(
    () => urlFilters !== null || urlPresetId !== null,
    [urlFilters, urlPresetId]
  );

  /**
   * Bookmark detection
   */
  const isBookmarked = useMemo(() => isBookmarkedFilter(), []);

  const bookmarkSuggestion = useMemo(() => suggestPresetFromBookmark(), []);

  // =============================================================================
  // URL SYNCHRONIZATION
  // =============================================================================

  /**
   * Syncs filters to URL with debouncing
   */
  const syncFiltersToURL = useCallback(
    (filters: AdvancedFilters, presetId?: string) => {
      if (!currentConfig.syncEnabled) return;

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce URL updates
      syncTimeoutRef.current = setTimeout(() => {
        try {
          updateBrowserURL(filters, presetId, replaceHistory);

          // Add to history
          setFilterHistory(prev => {
            const newEntry = {
              filters,
              presetId,
              timestamp: new Date(),
              url: generateFilterURL(filters, presetId),
            };

            const newHistory = [...prev.slice(0, historyIndex + 1), newEntry];

            // Limit history size
            if (newHistory.length > 50) {
              return newHistory.slice(-50);
            }

            return newHistory;
          });

          setHistoryIndex(prev => prev + 1);

          onURLChange?.(filters, presetId || null);
        } catch (error) {
          onError?.(error instanceof Error ? error.message : 'Failed to sync URL', 'url_sync');
        }
      }, currentConfig.debounceDelay);
    },
    [
      currentConfig.debounceDelay,
      currentConfig.syncEnabled,
      replaceHistory,
      historyIndex,
      onURLChange,
      onError,
    ]
  );

  /**
   * Loads filters from current URL
   */
  const loadFiltersFromURL = useCallback(() => {
    return {
      filters: urlFilters,
      presetId: urlPresetId,
    };
  }, [urlFilters, urlPresetId]);

  /**
   * Clears URL filters
   */
  const clearURLFilters = useCallback(() => {
    if (!currentConfig.syncEnabled) return;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('f'); // filters
      url.searchParams.delete('p'); // preset
      url.searchParams.delete('v'); // version

      if (replaceHistory) {
        window.history.replaceState(null, '', url.toString());
      } else {
        window.history.pushState(null, '', url.toString());
      }

      onURLChange?.(null, null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to clear URL', 'url_clear');
    }
  }, [currentConfig.syncEnabled, replaceHistory, onURLChange, onError]);

  // =============================================================================
  // SHARING OPERATIONS
  // =============================================================================

  /**
   * Generates a shareable link
   */
  const generateShareLink = useCallback(
    (
      filters: AdvancedFilters,
      presetId?: string,
      options?: { includeHost?: boolean; customPath?: string }
    ): string => {
      try {
        const shareURL = generateShareableLink(filters, presetId, {
          ...options,
          customPath: options?.customPath || basePath,
        });

        onShare?.(shareURL, 'link');
        return shareURL;
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to generate share link',
          'share_generation'
        );
        return '';
      }
    },
    [basePath, onShare, onError]
  );

  /**
   * Copies shareable link to clipboard
   */
  const copyShareLink = useCallback(
    async (
      filters: AdvancedFilters,
      presetId?: string,
      options?: { includeHost?: boolean; customPath?: string }
    ): Promise<boolean> => {
      try {
        const success = await copyShareableLinkToClipboard(filters, presetId, {
          ...options,
          customPath: options?.customPath || basePath,
        });

        if (success) {
          const shareURL = generateShareLink(filters, presetId, options);
          onShare?.(shareURL, 'clipboard');
        }

        return success;
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to copy share link',
          'clipboard_copy'
        );
        return false;
      }
    },
    [basePath, generateShareLink, onShare, onError]
  );

  /**
   * Generates QR code for sharing
   */
  const generateQRCode = useCallback(
    async (filters: AdvancedFilters, presetId?: string, size = 200): Promise<string | null> => {
      if (!currentConfig.enableQRCodeGeneration) {
        onError?.('QR code generation is disabled', 'qr_disabled');
        return null;
      }

      try {
        const qrDataURL = await generateQRCodeDataURL(filters, presetId, size);

        if (qrDataURL) {
          const shareURL = generateShareLink(filters, presetId);
          onShare?.(shareURL, 'qr');
        }

        return qrDataURL;
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to generate QR code',
          'qr_generation'
        );
        return null;
      }
    },
    [currentConfig.enableQRCodeGeneration, generateShareLink, onShare, onError]
  );

  // =============================================================================
  // NAVIGATION OPERATIONS
  // =============================================================================

  /**
   * Navigates with filters
   */
  const navigateWithFilters = useCallback(
    (filters: AdvancedFilters, presetId?: string, replace = replaceHistory) => {
      try {
        const filterURL = generateFilterURL(filters, presetId, basePath);
        const path = new URL(filterURL).pathname + new URL(filterURL).search;

        navigate(path, { replace });
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Failed to navigate', 'navigation');
      }
    },
    [navigate, basePath, replaceHistory, onError]
  );

  /**
   * Navigates to specific path with optional filters
   */
  const navigateToPath = useCallback(
    (path: string, filters?: AdvancedFilters) => {
      try {
        if (filters) {
          const filterURL = generateFilterURL(filters, undefined, path);
          navigate(new URL(filterURL).pathname + new URL(filterURL).search);
        } else {
          navigate(path);
        }
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : 'Failed to navigate to path',
          'path_navigation'
        );
      }
    },
    [navigate, onError]
  );

  // =============================================================================
  // HISTORY OPERATIONS
  // =============================================================================

  const canGoBack = useMemo(() => historyIndex > 0, [historyIndex]);

  const canGoForward = useMemo(
    () => historyIndex < filterHistory.length - 1,
    [historyIndex, filterHistory.length]
  );

  /**
   * Goes back in filter history
   */
  const goBack = useCallback(() => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      const entry = filterHistory[newIndex];

      setHistoryIndex(newIndex);
      navigateWithFilters(entry.filters, entry.presetId, true);
    }
  }, [canGoBack, historyIndex, filterHistory, navigateWithFilters]);

  /**
   * Goes forward in filter history
   */
  const goForward = useCallback(() => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      const entry = filterHistory[newIndex];

      setHistoryIndex(newIndex);
      navigateWithFilters(entry.filters, entry.presetId, true);
    }
  }, [canGoForward, historyIndex, filterHistory, navigateWithFilters]);

  /**
   * Gets filter history
   */
  const getFilterHistory = useCallback(() => {
    return [...filterHistory];
  }, [filterHistory]);

  // =============================================================================
  // URL VALIDATION & UTILITIES
  // =============================================================================

  /**
   * Validates a URL for filter parameters
   */
  const validateURL = useCallback(
    (url: string) => {
      try {
        const urlObj = new URL(url);
        const parsed = parseFiltersFromURL(urlObj.search);

        const warnings: string[] = [];

        if (parsed.version && !isVersionCompatible(parsed.version)) {
          warnings.push(`Unsupported version: ${parsed.version}`);
        }

        if (url.length > currentConfig.maxURLLength) {
          warnings.push('URL length exceeds recommended maximum');
        }

        return {
          isValid: parsed.filters !== null || parsed.presetId !== null,
          filters: parsed.filters,
          presetId: parsed.presetId,
          version: parsed.version,
          warnings,
        };
      } catch {
        return {
          isValid: false,
          filters: null,
          presetId: null,
          version: null,
          warnings: ['Invalid URL format'],
        };
      }
    },
    [currentConfig.maxURLLength]
  );

  /**
   * Gets current URL size
   */
  const getURLSize = useCallback((): number => {
    return currentURL.length;
  }, [currentURL]);

  /**
   * Checks if URL is too long
   */
  const isURLTooLong = useCallback((): boolean => {
    return getURLSize() > currentConfig.maxURLLength;
  }, [getURLSize, currentConfig.maxURLLength]);

  /**
   * Compresses URL parameters
   */
  const compressURL = useCallback((filters: AdvancedFilters): string => {
    return serializeFiltersToURL(filters);
  }, []);

  /**
   * Decompresses URL parameters
   */
  const decompressURL = useCallback((urlParam: string): AdvancedFilters | null => {
    return deserializeFiltersFromURL(urlParam);
  }, []);

  // =============================================================================
  // CONFIGURATION
  // =============================================================================

  /**
   * Updates configuration
   */
  const updateConfig = useCallback((configUpdate: Partial<FilterURLConfig>) => {
    setCurrentConfig(prev => ({ ...prev, ...configUpdate }));
  }, []);

  /**
   * Enables URL synchronization
   */
  const enableSync = useCallback(() => {
    updateConfig({ syncEnabled: true });
  }, [updateConfig]);

  /**
   * Disables URL synchronization
   */
  const disableSync = useCallback(() => {
    updateConfig({ syncEnabled: false });
  }, [updateConfig]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  /**
   * Handle URL changes and auto-sync
   */
  useEffect(() => {
    if (autoSync && hasURLFilters) {
      onURLChange?.(urlFilters, urlPresetId);
    }
  }, [autoSync, hasURLFilters, urlFilters, urlPresetId, onURLChange]);

  /**
   * Handle bookmark detection
   */
  useEffect(() => {
    if (currentConfig.enableBookmarkDetection && onBookmarkDetected) {
      onBookmarkDetected(bookmarkSuggestion);
    }
  }, [currentConfig.enableBookmarkDetection, bookmarkSuggestion, onBookmarkDetected]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    // URL State
    isURLSyncEnabled: currentConfig.syncEnabled,
    currentURL,
    hasURLFilters,
    urlFilters,
    urlPresetId,

    // URL Operations
    syncFiltersToURL,
    loadFiltersFromURL,
    clearURLFilters,

    // Sharing Operations
    generateShareLink,
    copyShareLink,
    generateQRCode,

    // Navigation Operations
    navigateWithFilters,
    navigateToPath,

    // Bookmark Operations
    isBookmarked,
    bookmarkSuggestion,

    // History Operations
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    getFilterHistory,

    // URL Validation
    validateURL,

    // URL Utilities
    getURLSize,
    isURLTooLong,
    compressURL,
    decompressURL,

    // Configuration
    updateConfig,
    enableSync,
    disableSync,
  };
};

// =============================================================================
// HOOK VARIANTS
// =============================================================================

/**
 * Simplified URL hook for basic synchronization
 */
export const useSimpleFilterURL = (autoSync = true) => {
  return useFilterURL({
    autoSync,
    config: {
      syncEnabled: true,
      enableHistory: false,
      enableBookmarkDetection: false,
      enableQRCodeGeneration: false,
    },
  });
};

/**
 * Read-only URL hook for parsing URL parameters
 */
export const useReadOnlyFilterURL = () => {
  const { urlFilters, urlPresetId, loadFiltersFromURL, validateURL } = useFilterURL({
    autoSync: false,
    config: {
      syncEnabled: false,
    },
  });

  return {
    urlFilters,
    urlPresetId,
    loadFiltersFromURL,
    validateURL,
  };
};

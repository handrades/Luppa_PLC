import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './useToast';
import { debounce } from 'lodash';

export interface UseAutoSaveOptions {
  onSave: (_data: Record<string, unknown>) => Promise<void> | void;
  delay?: number;
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (_error: Error) => void;
  showNotifications?: boolean;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  triggerSave: () => void;
}

/**
 * Hook for auto-saving form data with debouncing
 * Provides visual feedback and error handling
 */
export const useAutoSave = (
  data: Record<string, unknown>,
  options: UseAutoSaveOptions
): UseAutoSaveReturn => {
  const {
    onSave,
    delay = 3000,
    enabled = true,
    onSuccess,
    onError,
    showNotifications = true,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { showSuccess, showError: showErrorToast } = useToast();

  const saveInProgressRef = useRef(false);
  const previousDataRef = useRef<Record<string, unknown> | null>(null);

  const performSave = useCallback(async () => {
    if (saveInProgressRef.current) return;

    try {
      saveInProgressRef.current = true;
      setIsSaving(true);
      setError(null);

      await onSave(data);

      setLastSaved(new Date());
      previousDataRef.current = JSON.stringify(data);

      if (showNotifications) {
        showSuccess('Changes saved automatically', {
          preventDuplicate: true,
        });
      }

      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save');
      setError(error);

      if (showNotifications) {
        showErrorToast(`Auto-save failed: ${error.message}`, {
          persist: false,
        });
      }

      onError?.(error);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [data, onSave, onSuccess, onError, showNotifications, showSuccess, showErrorToast]);

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(() => {
      performSave();
    }, delay)
  ).current;

  // Trigger save when data changes
  useEffect(() => {
    if (!enabled) return;

    // Skip if data hasn't changed
    const currentDataString = JSON.stringify(data);
    if (currentDataString === previousDataRef.current) return;

    // Skip initial save when component mounts
    if (previousDataRef.current === null) {
      previousDataRef.current = currentDataString;
      return;
    }

    debouncedSave();

    return () => {
      debouncedSave.cancel();
    };
  }, [data, enabled, debouncedSave]);

  // Manual trigger for immediate save
  const triggerSave = useCallback(() => {
    debouncedSave.cancel();
    performSave();
  }, [debouncedSave, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    isSaving,
    lastSaved,
    error,
    triggerSave,
  };
};

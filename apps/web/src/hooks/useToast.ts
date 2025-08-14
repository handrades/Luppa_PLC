import { useCallback } from 'react';
import type { ReactNode } from 'react';

// Types for notistack compatibility
type SnackbarMessage = string | ReactNode;
// TODO: Replace with actual notistack import when available
// import type { VariantType as NotistackVariant } from 'notistack';
// type VariantType = NotistackVariant;
type VariantType = 'default' | 'error' | 'success' | 'warning' | 'info';

export interface ToastOptions {
  variant?: VariantType;
  persist?: boolean;
  preventDuplicate?: boolean;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

/**
 * Hook for displaying toast notifications
 * Wraps notistack's enqueueSnackbar for consistent usage
 */
export const useToast = () => {
  const showToast = useCallback((_message?: SnackbarMessage, _options?: ToastOptions) => {
    // TODO: Replace with actual notistack implementation
    // Temporarily disabled for linting compliance
    // console.log(`Toast [${_options?.variant || 'default'}]:`, _message, _options);
    return '';
  }, []);

  const showSuccess = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, { ...options, variant: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, { ...options, variant: 'error' });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, { ...options, variant: 'warning' });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, { ...options, variant: 'info' });
    },
    [showToast]
  );

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};

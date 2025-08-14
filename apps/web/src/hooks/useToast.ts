import { useCallback } from 'react';
import { SnackbarMessage, VariantType, enqueueSnackbar } from 'notistack';

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
  const showToast = useCallback(
    (message: SnackbarMessage, variant: VariantType = 'default', options?: ToastOptions) => {
      return enqueueSnackbar(message, {
        variant: options?.variant || variant,
        persist: options?.persist || false,
        preventDuplicate: options?.preventDuplicate !== false,
        anchorOrigin: options?.anchorOrigin || {
          vertical: 'bottom',
          horizontal: 'left',
        },
        autoHideDuration: options?.persist ? null : 5000,
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, 'success', options);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, 'error', options);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, 'warning', options);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: SnackbarMessage, options?: ToastOptions) => {
      return showToast(message, 'info', options);
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

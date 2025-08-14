import { useCallback } from 'react';

// Types for notistack compatibility
type SnackbarMessage = string | React.ReactNode;
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
  const showToast = useCallback(
    (message: SnackbarMessage, variant: VariantType = 'default', options?: ToastOptions) => {
      // TODO: Replace with actual notistack implementation
      console.log(`Toast [${variant}]:`, message, options);
      return '';
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

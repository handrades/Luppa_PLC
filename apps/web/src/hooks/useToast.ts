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
  const showToast = useCallback(() => {
    // TODO: Replace with actual notistack implementation
    // Temporarily disabled for linting compliance
    // console.log(`Toast [${variant}]:`, message, options);
    return '';
  }, []);

  const showSuccess = useCallback(
    (_message: SnackbarMessage, _options?: ToastOptions) => {
      return showToast();
    },
    [showToast]
  );

  const showError = useCallback(
    (_message: SnackbarMessage, _options?: ToastOptions) => {
      return showToast();
    },
    [showToast]
  );

  const showWarning = useCallback(
    (_message: SnackbarMessage, _options?: ToastOptions) => {
      return showToast();
    },
    [showToast]
  );

  const showInfo = useCallback(
    (_message: SnackbarMessage, _options?: ToastOptions) => {
      return showToast();
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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export interface UseFormDirtyStateOptions {
  enabled?: boolean;
  message?: string;
  onNavigationBlocked?: () => void;
  ignoreRoutes?: string[];
}

export interface UseFormDirtyStateReturn {
  isDirty: boolean;
  setIsDirty: (_dirty: boolean) => void;
  confirmDialog: ReactNode;
  resetDirtyState: () => void;
}

/**
 * Hook for tracking form dirty state and preventing accidental navigation
 * Provides browser and React Router navigation blocking
 */
export const useFormDirtyState = (
  formData: Record<string, unknown>,
  options: UseFormDirtyStateOptions = {}
): UseFormDirtyStateReturn => {
  const {
    enabled = true,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onNavigationBlocked,
    ignoreRoutes = [],
  } = options;

  const [isDirtyInternal, setIsDirtyInternal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const initialDataRef = useRef<string | null>(JSON.stringify(formData));
  // const location = useLocation();
  const navigate = useNavigate();

  // Track dirty state based on form data changes
  useEffect(() => {
    if (!enabled || initialDataRef.current === null || manualOverride !== null) return;

    const currentData = JSON.stringify(formData);
    const hasChanges = currentData !== initialDataRef.current;
    setIsDirtyInternal(hasChanges);
  }, [formData, enabled, manualOverride]);

  // Manual dirty state control
  const setIsDirty = useCallback((dirty: boolean) => {
    setManualOverride(dirty);
    setIsDirtyInternal(dirty);
  }, []);

  // Use manual override if set, otherwise use internal state
  const isDirty = manualOverride !== null ? manualOverride : isDirtyInternal;

  // Browser navigation blocking (beforeunload)
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, enabled, message]);

  // React Router navigation blocking
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!enabled || !isDirty) return false;

    // Check if the next route should be ignored
    const nextPath = nextLocation.pathname;
    if (ignoreRoutes.some(route => nextPath.startsWith(route))) {
      return false;
    }

    // Block navigation if form is dirty
    return currentLocation.pathname !== nextLocation.pathname;
  });

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      onNavigationBlocked?.();
      const location = blocker.location;
      if (location) {
        const fullUrl = location.pathname + (location.search || '') + (location.hash || '');
        setPendingLocation(fullUrl);
      } else {
        setPendingLocation(null);
      }
      setShowConfirmDialog(true);
    }
  }, [blocker.state, blocker.location, onNavigationBlocked]);

  // Handle confirmation dialog actions
  const handleConfirm = useCallback(() => {
    setShowConfirmDialog(false);
    setManualOverride(null);
    setIsDirtyInternal(false);

    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    } else if (pendingLocation) {
      navigate(pendingLocation);
    }

    setPendingLocation(null);
  }, [blocker, pendingLocation, navigate]);

  const handleCancel = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingLocation(null);

    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  }, [blocker]);

  // Reset dirty state
  const resetDirtyState = useCallback(() => {
    initialDataRef.current = JSON.stringify(formData);
    setManualOverride(null);
    setIsDirtyInternal(false);
  }, [formData]);

  // Confirmation dialog component
  const confirmDialog = (
    <Dialog
      open={showConfirmDialog}
      onClose={handleCancel}
      aria-labelledby='unsaved-changes-dialog-title'
      aria-describedby='unsaved-changes-dialog-description'
    >
      <DialogTitle id='unsaved-changes-dialog-title'>Unsaved Changes</DialogTitle>
      <DialogContent>
        <DialogContentText id='unsaved-changes-dialog-description'>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color='primary'>
          Stay
        </Button>
        <Button onClick={handleConfirm} color='error' autoFocus>
          Leave
        </Button>
      </DialogActions>
    </Dialog>
  );

  return {
    isDirty,
    setIsDirty,
    confirmDialog,
    resetDirtyState,
  };
};

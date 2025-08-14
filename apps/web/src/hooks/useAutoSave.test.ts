import { act, renderHook, waitFor } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

// Mock useToast
jest.mock('./useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
  }),
}));

// Mock lodash debounce to run immediately in tests
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: (...args: unknown[]) => void) => {
    const debounced = (...args: unknown[]) => fn(...args);
    debounced.cancel = jest.fn();
    return debounced;
  },
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default values', () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => useAutoSave({ test: 'data' }, { onSave }));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not save on initial mount', () => {
    const onSave = jest.fn();
    renderHook(() => useAutoSave({ test: 'data' }, { onSave }));

    act(() => {
      jest.runAllTimers();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves when data changes', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { onSave }), {
      initialProps: { data: { test: 'initial' } },
    });

    // Change data
    rerender({ data: { test: 'updated' } });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ test: 'updated' });
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('does not save when data is unchanged', () => {
    const onSave = jest.fn();
    const { rerender } = renderHook(({ data }) => useAutoSave(data, { onSave }), {
      initialProps: { data: { test: 'same' } },
    });

    // Rerender with same data
    rerender({ data: { test: 'same' } });

    act(() => {
      jest.runAllTimers();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('handles save errors', async () => {
    const error = new Error('Save failed');
    const onSave = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();

    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { onSave, onError }), {
      initialProps: { data: { test: 'initial' } },
    });

    // Change data to trigger save
    rerender({ data: { test: 'updated' } });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.lastSaved).toBeNull();
  });

  it('sets isSaving during save operation', async () => {
    let resolveSave: () => void;
    const savePromise = new Promise<void>(resolve => {
      resolveSave = resolve;
    });
    const onSave = jest.fn().mockReturnValue(savePromise);

    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { onSave }), {
      initialProps: { data: { test: 'initial' } },
    });

    // Change data to trigger save
    rerender({ data: { test: 'updated' } });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(true);
    });

    // Resolve the save
    act(() => {
      resolveSave!();
    });

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });
  });

  it('triggers manual save', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ test: 'data' }, { onSave }));

    // Trigger manual save
    act(() => {
      result.current.triggerSave();
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  it('respects enabled option', () => {
    const onSave = jest.fn();
    const { rerender } = renderHook(({ data, enabled }) => useAutoSave(data, { onSave, enabled }), {
      initialProps: { data: { test: 'initial' }, enabled: false },
    });

    // Change data while disabled
    rerender({ data: { test: 'updated' }, enabled: false });

    act(() => {
      jest.runAllTimers();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSuccess callback after successful save', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const { rerender } = renderHook(({ data }) => useAutoSave(data, { onSave, onSuccess }), {
      initialProps: { data: { test: 'initial' } },
    });

    // Change data to trigger save
    rerender({ data: { test: 'updated' } });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('prevents concurrent saves', async () => {
    let saveCount = 0;
    const onSave = jest.fn().mockImplementation(() => {
      saveCount++;
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    const { result, rerender } = renderHook(({ data }) => useAutoSave(data, { onSave, delay: 0 }), {
      initialProps: { data: { test: 'initial' } },
    });

    // Trigger multiple changes rapidly
    rerender({ data: { test: 'update1' } });
    rerender({ data: { test: 'update2' } });
    rerender({ data: { test: 'update3' } });

    // Also trigger manual save
    act(() => {
      result.current.triggerSave();
    });

    await waitFor(() => {
      expect(saveCount).toBeLessThanOrEqual(2); // Should not save concurrently
    });
  });
});

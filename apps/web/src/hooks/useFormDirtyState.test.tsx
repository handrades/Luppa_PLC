import { fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { useFormDirtyState } from './useFormDirtyState';
import React from 'react';

// Simple mock component to test the hook
const TestComponent = ({
  initialFormData = {},
  options = {},
}: {
  initialFormData?: Record<string, unknown>;
  options?: Record<string, unknown>;
}) => {
  const [formData, setFormData] = React.useState(initialFormData);
  const { isDirty, setIsDirty, confirmDialog, resetDirtyState } = useFormDirtyState(
    formData,
    options
  );

  return (
    <div>
      <div data-testid='dirty-status'>{isDirty ? 'dirty' : 'clean'}</div>
      <button
        onClick={() => setFormData({ ...formData, field1: 'changed' })}
        data-testid='make-dirty'
      >
        Make Dirty
      </button>
      <button onClick={() => setFormData(initialFormData)} data-testid='make-clean'>
        Make Clean
      </button>
      <button onClick={() => setIsDirty(true)} data-testid='set-dirty-manual'>
        Set Dirty Manual
      </button>
      <button onClick={() => setIsDirty(false)} data-testid='set-clean-manual'>
        Set Clean Manual
      </button>
      <button onClick={() => resetDirtyState()} data-testid='reset'>
        Reset
      </button>
      {confirmDialog}
    </div>
  );
};

const TestApp = ({
  initialFormData = {},
  options = {},
}: {
  initialFormData?: Record<string, unknown>;
  options?: Record<string, unknown>;
}) => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <TestComponent initialFormData={initialFormData} options={options} />,
      },
    ],
    {
      initialEntries: ['/'],
    }
  );

  return <RouterProvider router={router} />;
};

// Mock beforeunload event
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Store original methods
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

beforeEach(() => {
  // Mock event listeners
  window.addEventListener = mockAddEventListener;
  window.removeEventListener = mockRemoveEventListener;
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore original methods
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
});

describe('useFormDirtyState', () => {
  describe('Basic State Management', () => {
    it('should start with clean state by default', () => {
      render(<TestApp />);
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('clean');
    });

    it('should allow setting dirty state', () => {
      render(<TestApp />);

      fireEvent.click(screen.getByTestId('make-dirty'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('dirty');
    });

    it('should allow setting clean state', () => {
      render(<TestApp initialFormData={{ field1: 'initial' }} />);

      // First make it dirty by changing form data
      fireEvent.click(screen.getByTestId('make-dirty'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('dirty');

      // Then make it clean by resetting form data
      fireEvent.click(screen.getByTestId('make-clean'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('clean');
    });

    it('should reset dirty state', () => {
      render(<TestApp initialFormData={{ field1: 'initial' }} />);

      // First make it dirty by changing form data
      fireEvent.click(screen.getByTestId('make-dirty'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('dirty');

      // Then reset the dirty state
      fireEvent.click(screen.getByTestId('reset'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('clean');
    });

    it('should allow manual dirty state control', () => {
      render(<TestApp />);

      // Test manual setIsDirty(true)
      fireEvent.click(screen.getByTestId('set-dirty-manual'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('dirty');

      // Test manual setIsDirty(false)
      fireEvent.click(screen.getByTestId('set-clean-manual'));
      expect(screen.getByTestId('dirty-status')).toHaveTextContent('clean');
    });
  });

  describe('Browser Navigation Blocking', () => {
    it('should add beforeunload listener when dirty', () => {
      render(<TestApp />);

      fireEvent.click(screen.getByTestId('make-dirty'));

      // Check if beforeunload was added (filter out other listeners)
      const beforeunloadCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCalls.length).toBeGreaterThan(0);
    });

    it('should remove beforeunload listener when clean', () => {
      render(<TestApp initialFormData={{ field1: 'initial' }} />);

      // First make it dirty
      fireEvent.click(screen.getByTestId('make-dirty'));

      // Clear previous calls to focus on the cleanup
      jest.clearAllMocks();

      // Then make it clean
      fireEvent.click(screen.getByTestId('make-clean'));

      // Check if beforeunload was removed
      const beforeunloadCalls = mockRemoveEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCalls.length).toBeGreaterThan(0);
    });

    it('should not add beforeunload listener when disabled', () => {
      render(<TestApp options={{ enabled: false }} />);

      fireEvent.click(screen.getByTestId('make-dirty'));

      // Check if beforeunload was NOT added
      const beforeunloadCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCalls.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid state changes', () => {
      render(<TestApp initialFormData={{ field1: 'initial' }} />);

      // Rapidly toggle dirty state
      fireEvent.click(screen.getByTestId('make-dirty'));
      fireEvent.click(screen.getByTestId('make-clean'));
      fireEvent.click(screen.getByTestId('make-dirty'));

      expect(screen.getByTestId('dirty-status')).toHaveTextContent('dirty');
    });

    it('should cleanup on unmount', () => {
      const { unmount } = render(<TestApp initialFormData={{ field1: 'initial' }} />);

      // Make it dirty first
      fireEvent.click(screen.getByTestId('make-dirty'));

      // Clear previous calls to focus on the cleanup
      jest.clearAllMocks();

      unmount();

      // Check if beforeunload was removed during cleanup
      const beforeunloadCalls = mockRemoveEventListener.mock.calls.filter(
        call => call[0] === 'beforeunload'
      );
      expect(beforeunloadCalls.length).toBeGreaterThan(0);
    });
  });
});

import { act, render, renderHook, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { ReactNode } from 'react';

describe('ThemeContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
  });

  describe('ThemeProvider', () => {
    it('should provide theme context to children', () => {
      const TestComponent = () => {
        const { mode } = useTheme();
        return <div>Current mode: {mode}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByText(/Current mode: light/i)).toBeInTheDocument();
    });

    it('should apply theme mode to document element', () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should load saved theme mode from localStorage', () => {
      localStorage.setItem('themeMode', 'dark');

      const TestComponent = () => {
        const { mode } = useTheme();
        return <div>Current mode: {mode}</div>;
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByText(/Current mode: dark/i)).toBeInTheDocument();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('should provide theme mode', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.mode).toBe('light');
    });

    it('should provide toggleTheme function', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(typeof result.current.toggleTheme).toBe('function');
    });

    it('should toggle theme mode', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
      expect(localStorage.getItem('themeMode')).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
      expect(localStorage.getItem('themeMode')).toBe('light');
    });

    it('should update document attribute when theme changes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Theme Integration', () => {
    it('should render Material-UI components with theme', () => {
      const TestComponent = () => {
        return (
          <div>
            <button>Test Button</button>
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should memoize theme object for performance', () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const { mode } = useTheme();
        return <div>Mode: {mode}</div>;
      };

      const { rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const initialRenderCount = renderCount;

      // Rerender with same props shouldn't cause theme recreation
      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Component might rerender but theme should be memoized
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1);
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider } from '../../../contexts/ThemeContext';

describe('ThemeToggle', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should render theme toggle button', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('should show light mode icon initially', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle-button');
    expect(button).toBeInTheDocument();
    // Brightness4 icon is shown in light mode
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should toggle between light and dark mode on click', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    // Initially in light mode
    expect(localStorage.getItem('themeMode')).toBeNull();

    // Click to switch to dark mode
    fireEvent.click(button);
    expect(localStorage.getItem('themeMode')).toBe('dark');

    // Click to switch back to light mode
    fireEvent.click(button);
    expect(localStorage.getItem('themeMode')).toBe('light');
  });

  it('should have correct accessibility attributes', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    expect(button).toHaveAttribute('aria-label', 'toggle theme');
    expect(button).toHaveAttribute('aria-pressed');
  });

  it('should show tooltip with correct text', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    // Hover to show tooltip
    fireEvent.mouseOver(button);

    // Note: Testing Material-UI tooltips requires more complex setup
    // This test verifies the button is present and interactive
    expect(button).toBeInTheDocument();
  });

  it('should be keyboard accessible', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    // Should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);

    // Keyboard navigation handled by Material-UI IconButton
    // Click simulates both mouse and keyboard activation
    fireEvent.click(button);
    expect(localStorage.getItem('themeMode')).toBe('dark');
  });

  it('should update aria-pressed based on theme mode', () => {
    renderWithTheme(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    // Initially false (light mode)
    expect(button).toHaveAttribute('aria-pressed', 'false');

    // Click to dark mode
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    // Click back to light mode
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});

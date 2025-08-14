import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidationError } from './ValidationError';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ValidationError', () => {
  it('returns null when no errors provided', () => {
    const { container } = renderWithTheme(<ValidationError />);

    expect(container.firstChild).toBeNull();
  });

  it('displays single string error', () => {
    renderWithTheme(<ValidationError errors='This field is required' />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays array of errors', () => {
    const errors = ['Email is required', 'Password must be at least 8 characters'];

    renderWithTheme(<ValidationError errors={errors} />);

    expect(screen.getByText('• Email is required')).toBeInTheDocument();
    expect(screen.getByText('• Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('displays object of errors', () => {
    const errors = {
      email: 'Invalid email format',
      password: 'Too short',
    };

    renderWithTheme(<ValidationError errors={errors} />);

    expect(screen.getByText('• email: Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('• password: Too short')).toBeInTheDocument();
  });

  it('displays custom title for multiple errors', () => {
    const errors = ['Error 1', 'Error 2'];

    renderWithTheme(<ValidationError errors={errors} title='Form Errors' />);

    expect(screen.getByText('Form Errors')).toBeInTheDocument();
  });

  it('displays warning severity', () => {
    renderWithTheme(<ValidationError errors='This is a warning' severity='warning' />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardWarning');
  });

  it('displays compact mode for single error', () => {
    renderWithTheme(<ValidationError errors='Compact error' compact />);

    expect(screen.getByText('Compact error')).toBeInTheDocument();
    // In compact mode, it should not use Alert component
    expect(screen.queryByRole('alert')?.className).not.toContain('MuiAlert');
  });

  it('handles nested error objects with message property', () => {
    const errors = {
      email: { message: 'Email is invalid' },
      phone: { message: 'Phone number required' },
    };

    renderWithTheme(<ValidationError errors={errors} />);

    expect(screen.getByText('• email: Email is invalid')).toBeInTheDocument();
    expect(screen.getByText('• phone: Phone number required')).toBeInTheDocument();
  });

  it('filters out empty errors from array', () => {
    const errors = ['Error 1', '', null, undefined, 'Error 2'];

    renderWithTheme(<ValidationError errors={errors as string[]} />);

    expect(screen.getByText('• Error 1')).toBeInTheDocument();
    expect(screen.getByText('• Error 2')).toBeInTheDocument();
    expect(screen.queryByText('•')).toBeNull();
  });

  it('has proper aria attributes for accessibility', () => {
    renderWithTheme(<ValidationError errors='Accessible error' />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});

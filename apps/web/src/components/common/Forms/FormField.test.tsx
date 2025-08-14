import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('FormField', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <FormField>
        <div data-testid='child-element'>Test Child</div>
      </FormField>
    );

    expect(screen.getByTestId('child-element')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('displays label when provided', () => {
    renderWithTheme(
      <FormField label='Test Label' htmlFor='test-input'>
        <input id='test-input' />
      </FormField>
    );

    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('shows required indicator when required prop is true', () => {
    renderWithTheme(
      <FormField label='Required Field' required>
        <input />
      </FormField>
    );

    const label = screen.getByText('Required Field');
    const asterisk = label.querySelector('.MuiFormLabel-asterisk');
    expect(asterisk).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    renderWithTheme(
      <FormField error='This field has an error'>
        <input />
      </FormField>
    );

    const errorText = screen.getByText('This field has an error');
    expect(errorText).toBeInTheDocument();
    expect(errorText).toHaveClass('Mui-error');
  });

  it('displays helper text when no error is present', () => {
    renderWithTheme(
      <FormField helperText='This is helpful information'>
        <input />
      </FormField>
    );

    expect(screen.getByText('This is helpful information')).toBeInTheDocument();
  });

  it('prioritizes error message over helper text', () => {
    renderWithTheme(
      <FormField error='Error message' helperText='Helper text'>
        <input />
      </FormField>
    );

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('sets aria-describedby on helper text', () => {
    renderWithTheme(
      <FormField error='Error message' htmlFor='test-field'>
        <input id='test-field' />
      </FormField>
    );

    const helperText = screen.getByText('Error message');
    expect(helperText).toHaveAttribute('id', 'test-field-helper-text');
  });

  it('applies fullWidth prop correctly', () => {
    const { container } = renderWithTheme(
      <FormField fullWidth={false}>
        <input />
      </FormField>
    );

    const formControl = container.querySelector('.MuiFormControl-root');
    expect(formControl).not.toHaveClass('MuiFormControl-fullWidth');
  });
});

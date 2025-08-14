import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextInput } from './TextInput';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('TextInput', () => {
  it('renders with label', () => {
    renderWithTheme(<TextInput id='test-input' label='Test Label' />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays error message', () => {
    renderWithTheme(
      <TextInput id='test-input' label='Test Input' error='This field is required' />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    renderWithTheme(<TextInput id='test-input' label='Required Input' required />);

    const label = screen.getByText('Required Input');
    expect(label.querySelector('.MuiFormLabel-asterisk')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('displays helper text', () => {
    renderWithTheme(<TextInput id='test-input' label='Input' helperText='Enter your text here' />);

    expect(screen.getByText('Enter your text here')).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    renderWithTheme(<TextInput id='test-input' label='Input' onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies custom placeholder', () => {
    renderWithTheme(<TextInput id='test-input' label='Input' placeholder='Enter text...' />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter text...');
  });

  it('can be disabled', () => {
    renderWithTheme(<TextInput id='test-input' label='Disabled Input' disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('sets aria-describedby when error is present', () => {
    renderWithTheme(<TextInput id='test-input' label='Input' error='Error message' />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-helper-text');
  });

  it('has minimum height for touch-friendly size', () => {
    const { container } = renderWithTheme(<TextInput id='test-input' label='Touch Input' />);

    const inputBase = container.querySelector('.MuiInputBase-root');
    expect(inputBase).toHaveStyle({ minHeight: '48px' });
  });

  it('accepts multiline prop', () => {
    renderWithTheme(<TextInput id='test-input' label='Multiline Input' multiline rows={4} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });
});

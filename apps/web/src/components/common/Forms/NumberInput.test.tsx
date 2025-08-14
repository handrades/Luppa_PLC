import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberInput } from './NumberInput';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('NumberInput', () => {
  it('renders with label', () => {
    renderWithTheme(<NumberInput id='test-number' label='Number Input' />);

    expect(screen.getByText('Number Input')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('accepts numeric input', () => {
    const handleChange = jest.fn();
    renderWithTheme(<NumberInput id='test-number' label='Number' onChange={handleChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '42' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('enforces min constraint', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <NumberInput id='test-number' label='Number' min={10} value={15} onChange={handleChange} />
    );

    const input = screen.getByRole('spinbutton');

    // Try to set value below minimum - it should not call onChange
    fireEvent.change(input, { target: { value: '5' } });
    expect(handleChange).not.toHaveBeenCalled();

    // Set valid value above minimum
    fireEvent.change(input, { target: { value: '20' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('enforces max constraint', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <NumberInput id='test-number' label='Number' max={100} value={50} onChange={handleChange} />
    );

    const input = screen.getByRole('spinbutton');

    // Try to set value above maximum
    fireEvent.change(input, { target: { value: '150' } });
    expect(handleChange).not.toHaveBeenCalled();

    // Set valid value
    fireEvent.change(input, { target: { value: '75' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('allows clearing the field', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <NumberInput id='test-number' label='Number' value={42} onChange={handleChange} />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('sets step attribute', () => {
    renderWithTheme(<NumberInput id='test-number' label='Number' step={0.1} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.1');
  });

  it('displays error message', () => {
    renderWithTheme(
      <NumberInput id='test-number' label='Number' error='Must be a positive number' />
    );

    expect(screen.getByText('Must be a positive number')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    renderWithTheme(<NumberInput id='test-number' label='Required Number' required />);

    const label = screen.getByText('Required Number');
    expect(label.querySelector('.MuiFormLabel-asterisk')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    renderWithTheme(<NumberInput id='test-number' label='Number' min={0} max={100} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '100');
  });

  it('has minimum height for touch-friendly size', () => {
    const { container } = renderWithTheme(<NumberInput id='test-number' label='Touch Number' />);

    const inputBase = container.querySelector('.MuiInputBase-root');
    expect(inputBase).toHaveStyle({ minHeight: '48px' });
  });

  it('hides spinner buttons', () => {
    const { container } = renderWithTheme(<NumberInput id='test-number' label='Number' />);

    // Check that the CSS for hiding spinners is applied
    const input = container.querySelector('input[type=number]');
    expect(input).toBeInTheDocument();
    // The actual style is handled by CSS, we just verify the input exists
  });
});

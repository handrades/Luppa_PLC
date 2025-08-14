import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DatePicker } from './DatePicker';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('DatePicker', () => {
  it('renders with label', () => {
    renderWithTheme(
      <DatePicker id='test-date' label='Date Picker' value={null} onChange={() => {}} />
    );

    expect(screen.getByText('Date Picker')).toBeInTheDocument();
  });

  it('displays selected date', () => {
    const testDate = new Date(2024, 0, 15); // January 15, 2024
    renderWithTheme(
      <DatePicker id='test-date' label='Date' value={testDate} onChange={() => {}} />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    // The value will be displayed based on locale
    expect(input.value).toContain('15');
    expect(input.value).toContain('2024');
  });

  it('displays error message', () => {
    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Date'
        value={null}
        onChange={() => {}}
        error='Please select a date'
      />
    );

    expect(screen.getByText('Please select a date')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    renderWithTheme(
      <DatePicker id='test-date' label='Required Date' value={null} onChange={() => {}} required />
    );

    const label = screen.getByText('Required Date');
    expect(label.querySelector('.MuiFormLabel-asterisk')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('displays helper text', () => {
    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Date'
        value={null}
        onChange={() => {}}
        helperText='Select your birth date'
      />
    );

    expect(screen.getByText('Select your birth date')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    renderWithTheme(
      <DatePicker id='test-date' label='Disabled Date' value={null} onChange={() => {}} disabled />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('can be read-only', () => {
    const testDate = new Date(2024, 0, 15); // January 15, 2024
    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Read-only Date'
        value={testDate}
        onChange={() => {}}
        readOnly
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('opens calendar on button click', async () => {
    renderWithTheme(<DatePicker id='test-date' label='Date' value={null} onChange={() => {}} />);

    // Find and click the calendar button
    const calendarButton = screen.getByRole('button', { name: /choose date/i });
    fireEvent.click(calendarButton);

    // Wait for the calendar dialog to appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('calls onChange when date is selected', async () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <DatePicker id='test-date' label='Date' value={null} onChange={handleChange} />
    );

    // Open the calendar
    const calendarButton = screen.getByRole('button', { name: /choose date/i });
    fireEvent.click(calendarButton);

    // Wait for dialog and select a date
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      const dateButton = within(dialog).getByText('15');
      fireEvent.click(dateButton);
    });

    expect(handleChange).toHaveBeenCalled();
  });

  it('sets aria-describedby when error is present', () => {
    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Date'
        value={null}
        onChange={() => {}}
        error='Error message'
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'test-date-helper-text');
  });

  it('has minimum height for touch-friendly size', () => {
    const { container } = renderWithTheme(
      <DatePicker id='test-date' label='Touch Date' value={null} onChange={() => {}} />
    );

    const inputBase = container.querySelector('.MuiInputBase-root');
    expect(inputBase).toHaveStyle({ minHeight: '48px' });
  });

  it('handles minDate constraint', () => {
    const minDate = new Date(2024, 0, 1); // January 1, 2024
    const testDate = new Date(2024, 0, 15); // January 15, 2024

    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Date'
        value={testDate}
        onChange={() => {}}
        minDate={minDate}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('15');
    expect(input.value).toContain('2024');
  });

  it('handles maxDate constraint', () => {
    const maxDate = new Date(2024, 11, 31); // December 31, 2024
    const testDate = new Date(2024, 5, 15); // June 15, 2024

    renderWithTheme(
      <DatePicker
        id='test-date'
        label='Date'
        value={testDate}
        onChange={() => {}}
        maxDate={maxDate}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('15');
    expect(input.value).toContain('2024');
  });
});

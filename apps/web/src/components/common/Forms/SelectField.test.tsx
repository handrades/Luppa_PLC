import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SelectField, SelectOption } from './SelectField';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('SelectField', () => {
  it('renders with label', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Select Field'
        options={mockOptions}
        value='__EMPTY_OPTION__'
      />
    );

    expect(screen.getByText('Select Field')).toBeInTheDocument();
  });

  it('displays placeholder when no value selected', () => {
    renderWithTheme(
      <SelectField id='test-select' label='Select' options={mockOptions} value='__EMPTY_OPTION__' />
    );

    expect(screen.getByText('Select an option...')).toBeInTheDocument();
  });

  it('shows selected option label', () => {
    renderWithTheme(
      <SelectField id='test-select' label='Select' options={mockOptions} value='option1' />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    renderWithTheme(
      <SelectField id='test-select' label='Select' options={mockOptions} value='__EMPTY_OPTION__' />
    );

    const selectButton = screen.getByRole('combobox');
    fireEvent.mouseDown(selectButton);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    mockOptions.forEach(option => {
      expect(screen.getByRole('option', { name: option.label })).toBeInTheDocument();
    });
  });

  it('shows empty option when showEmptyOption is true', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Select'
        options={mockOptions}
        value='__EMPTY_OPTION__'
        showEmptyOption
        emptyOptionLabel='Clear selection'
      />
    );

    const selectButton = screen.getByRole('combobox');
    fireEvent.mouseDown(selectButton);

    expect(screen.getByText('Clear selection')).toBeInTheDocument();
  });

  it('handles disabled options', () => {
    renderWithTheme(
      <SelectField id='test-select' label='Select' options={mockOptions} value='__EMPTY_OPTION__' />
    );

    const selectButton = screen.getByRole('combobox');
    fireEvent.mouseDown(selectButton);

    const disabledOption = screen.getByRole('option', { name: 'Option 3' });
    expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
  });

  it('displays error message', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Select'
        options={mockOptions}
        value='__EMPTY_OPTION__'
        error='Please select an option'
      />
    );

    expect(screen.getByText('Please select an option')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Required Select'
        options={mockOptions}
        value='__EMPTY_OPTION__'
        required
      />
    );

    const label = screen.getByText('Required Select');
    expect(label.querySelector('.MuiFormLabel-asterisk')).toBeInTheDocument();
    // The aria-required is on the internal input element
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles multiple selection', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Multi Select'
        options={mockOptions}
        value={['option1', 'option2']}
        multiple
      />
    );

    // Should show chips for selected values
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('shows checkboxes in multiple mode', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Multi Select'
        options={mockOptions}
        value={['option1']}
        multiple
      />
    );

    const selectButton = screen.getByRole('combobox');
    fireEvent.mouseDown(selectButton);

    const listbox = screen.getByRole('listbox');
    const checkboxes = within(listbox).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(mockOptions.length);

    // First checkbox should be checked
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('displays placeholder for empty multiple selection', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Multi Select'
        options={mockOptions}
        value={[]}
        multiple
      />
    );

    expect(screen.getByText('Select options...')).toBeInTheDocument();
  });

  it('has minimum height for touch-friendly size', () => {
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Touch Select'
        options={mockOptions}
        value='__EMPTY_OPTION__'
      />
    );

    const combobox = screen.getByRole('combobox');
    const selectRoot = combobox.closest('.MuiInputBase-root');
    expect(selectRoot).toHaveStyle({ minHeight: '48px' });
  });

  it('calls onChange when option is selected', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <SelectField
        id='test-select'
        label='Select'
        options={mockOptions}
        value='__EMPTY_OPTION__'
        onChange={handleChange}
      />
    );

    const selectButton = screen.getByRole('combobox');
    fireEvent.mouseDown(selectButton);

    const option = screen.getByRole('option', { name: 'Option 1' });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalled();
  });
});

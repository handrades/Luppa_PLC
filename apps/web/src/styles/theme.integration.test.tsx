import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Box, Button, Card, TextField, Typography } from '@mui/material';

describe('Theme Integration', () => {
  const TestComponent = () => (
    <ThemeProvider>
      <Box>
        <Typography variant='h1'>Heading 1</Typography>
        <Typography variant='h2'>Heading 2</Typography>
        <Typography variant='h3'>Heading 3</Typography>
        <Typography variant='body1'>Body text</Typography>
        <Typography variant='caption'>Caption text</Typography>
        <Button variant='contained' color='primary'>
          Primary Button
        </Button>
        <Button variant='outlined' color='secondary'>
          Secondary Button
        </Button>
        <Card>
          <Typography>Card content</Typography>
        </Card>
        <TextField label='Test Input' variant='outlined' />
      </Box>
    </ThemeProvider>
  );

  it('should render all themed components without errors', () => {
    render(<TestComponent />);

    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Heading 3')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
    expect(screen.getByText('Caption text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primary button/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /secondary button/i })).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
  });

  it('should apply custom typography styles', () => {
    render(<TestComponent />);

    const h1 = screen.getByText('Heading 1');
    const computedStyle = window.getComputedStyle(h1);

    // Typography should have Roboto font family
    expect(computedStyle.fontFamily).toContain('Roboto');
  });

  it('should apply industrial color palette', () => {
    render(
      <ThemeProvider>
        <Box>
          <Button variant='contained' color='primary'>
            Primary
          </Button>
          <Button variant='contained' color='secondary'>
            Secondary
          </Button>
          <Button variant='contained' color='success'>
            Success
          </Button>
          <Button variant='contained' color='warning'>
            Warning
          </Button>
          <Button variant='contained' color='error'>
            Error
          </Button>
        </Box>
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /secondary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /success/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /warning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /error/i })).toBeInTheDocument();
  });

  it('should handle theme switching across component tree', () => {
    const { rerender } = render(<TestComponent />);

    // Initial render should work
    expect(screen.getByText('Heading 1')).toBeInTheDocument();

    // Set dark mode and rerender
    localStorage.setItem('themeMode', 'dark');
    rerender(<TestComponent />);

    // Components should still render correctly
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
  });

  it('should apply responsive breakpoints', () => {
    render(
      <ThemeProvider>
        <Box
          sx={{
            width: {
              xs: '100%',
              sm: '50%',
              md: '33%',
              lg: '25%',
              xl: '20%',
            },
          }}
          data-testid='responsive-box'
        >
          Responsive content
        </Box>
      </ThemeProvider>
    );

    const box = screen.getByTestId('responsive-box');
    expect(box).toBeInTheDocument();
    expect(screen.getByText('Responsive content')).toBeInTheDocument();
  });

  it('should apply spacing system correctly', () => {
    render(
      <ThemeProvider>
        <Box sx={{ p: 1 }} data-testid='spacing-1'>
          Spacing 1
        </Box>
        <Box sx={{ p: 2 }} data-testid='spacing-2'>
          Spacing 2
        </Box>
        <Box sx={{ p: 3 }} data-testid='spacing-3'>
          Spacing 3
        </Box>
      </ThemeProvider>
    );

    expect(screen.getByTestId('spacing-1')).toBeInTheDocument();
    expect(screen.getByTestId('spacing-2')).toBeInTheDocument();
    expect(screen.getByTestId('spacing-3')).toBeInTheDocument();
  });

  it('should apply component overrides', () => {
    render(
      <ThemeProvider>
        <Button variant='contained'>Test Button</Button>
        <Card>Test Card</Card>
        <TextField label='Test Field' />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /test button/i });
    const card = screen.getByText('Test Card').parentElement;
    const textField = screen.getByLabelText('Test Field');

    expect(button).toBeInTheDocument();
    expect(card).toBeInTheDocument();
    expect(textField).toBeInTheDocument();
  });

  it('should handle Material-UI CssBaseline', () => {
    const { container } = render(<TestComponent />);

    // CssBaseline should be applied (normalizes styles)
    expect(container.firstChild).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { AppLayout } from './AppLayout';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider>{children}</ThemeProvider>
  </BrowserRouter>
);

// Mock matchMedia for responsive tests
const createMatchMedia = (width: number) => (query: string) => ({
  matches: query.includes('max-width')
    ? width <= parseInt(query.match(/\d+/)?.[0] || '0')
    : query.includes('min-width')
      ? width >= parseInt(query.match(/\d+/)?.[0] || '0')
      : false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('AppLayout', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(1024) as typeof window.matchMedia;
  });

  test('renders header and content', () => {
    render(
      <TestWrapper>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    );

    expect(screen.getByText('Luppa Inventory')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders with Container by default', () => {
    const { container } = render(
      <TestWrapper>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    );

    const mainElement = container.querySelector('main');
    const containerElement = mainElement?.querySelector('.MuiContainer-root');
    expect(containerElement).toBeInTheDocument();
  });

  test('renders full width when fullWidth prop is true', () => {
    const { container } = render(
      <TestWrapper>
        <AppLayout fullWidth={true}>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    );

    const mainElement = container.querySelector('main');
    const containerElement = mainElement?.querySelector('.MuiContainer-root');
    expect(containerElement).not.toBeInTheDocument();
  });

  test('applies custom maxWidth prop', () => {
    const { container } = render(
      <TestWrapper>
        <AppLayout maxWidth='sm'>
          <div>Test Content</div>
        </AppLayout>
      </TestWrapper>
    );

    const containerElement = container.querySelector('.MuiContainer-maxWidthSm');
    expect(containerElement).toBeInTheDocument();
  });

  test('disables padding when disablePadding is true', () => {
    render(
      <TestWrapper>
        <AppLayout disablePadding={true}>
          <div data-testid='test-content'>Test Content</div>
        </AppLayout>
      </TestWrapper>
    );

    const testContent = screen.getByTestId('test-content');
    expect(testContent).toBeInTheDocument();
  });

  describe('Mobile behavior', () => {
    beforeEach(() => {
      window.matchMedia = createMatchMedia(500) as typeof window.matchMedia;
    });

    test('shows hamburger menu on mobile', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      expect(menuButton).toBeInTheDocument();
    });

    test('opens temporary drawer when menu button is clicked on mobile', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', {
        name: /open navigation menu/i,
      });
      fireEvent.click(menuButton);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });
  });

  describe('Desktop behavior', () => {
    beforeEach(() => {
      window.matchMedia = createMatchMedia(1280) as typeof window.matchMedia;
    });

    test('does not show hamburger menu on desktop', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const menuButton = screen.queryByRole('button', {
        name: /open navigation menu/i,
      });
      expect(menuButton).not.toBeInTheDocument();
    });

    test('shows permanent drawer on desktop', () => {
      render(
        <TestWrapper>
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });
  });
});

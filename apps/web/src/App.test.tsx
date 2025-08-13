import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';

// Mock the entire auth service module
jest.mock('./services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
    getToken: jest.fn(),
    hasRole: jest.fn(),
  },
}));

// Import the mocked module
import { authService } from './services/auth.service';

const AppWrapper = ({
  children,
  initialEntries = ['/'],
}: {
  children: React.ReactNode;
  initialEntries?: string[];
}) => (
  <MemoryRouter
    initialEntries={initialEntries}
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider>{children}</ThemeProvider>
  </MemoryRouter>
);

describe('App', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );
  });

  test('renders login page when not authenticated', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    expect(screen.getByText('Luppa Inventory')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access the system')).toBeInTheDocument();
  });

  test('renders dashboard when authenticated', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);

    render(
      <AppWrapper initialEntries={['/']}>
        <App />
      </AppWrapper>
    );

    // Check for dashboard content - there should be multiple Dashboard texts (sidebar + main content)
    const dashboardElements = screen.getAllByText('Dashboard');
    expect(dashboardElements.length).toBeGreaterThan(0);
    
    // Check for text that's specific to the dashboard page
    expect(screen.getByText('Overview of your PLC inventory system')).toBeInTheDocument();
    expect(screen.getByText('Total PLCs')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import App from './App';
import { theme } from './styles/theme';
import { authService } from './services/auth.service';

const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </BrowserRouter>
);

// Mock the auth service
jest.mock('./services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getToken: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('App', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );
  });

  test('renders login page when not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    expect(screen.getByText('Luppa Inventory')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access the system')).toBeInTheDocument();
  });

  test('renders dashboard when authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

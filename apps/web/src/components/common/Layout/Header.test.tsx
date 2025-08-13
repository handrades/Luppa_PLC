import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Header } from './Header';
import { useAuthStore } from '../../../stores/authStore';

// Mock the auth store
jest.mock('../../../stores/authStore');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>{children}</ThemeProvider>
  </BrowserRouter>
);

describe('Header', () => {
  const mockOnMenuClick = jest.fn();
  const mockLogout = jest.fn();
  const mockLoadUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header with title', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    expect(screen.getByText('Luppa Inventory')).toBeInTheDocument();
  });

  test('shows loading skeleton when auth is loading', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: true,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    const { container } = render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  test('displays user initials when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'admin',
        isActive: true,
        lastLogin: null,
      },
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  test('shows user details in menu when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'admin',
        isActive: true,
        lastLogin: null,
      },
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    const avatarButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(avatarButton);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Role: Administrator')).toBeInTheDocument();
  });

  test('calls logout when logout menu item is clicked', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'admin',
        isActive: true,
        lastLogin: null,
      },
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    const avatarButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(avatarButton);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  test('shows hamburger menu on mobile', () => {
    // Mock mobile viewport
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(menuButton).toBeInTheDocument();

    fireEvent.click(menuButton);
    expect(mockOnMenuClick).toHaveBeenCalled();
  });

  test('loads user on mount', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isLoading: false,
      logout: mockLogout,
      loadUser: mockLoadUser,
    } as ReturnType<typeof useAuthStore>);

    render(
      <TestWrapper>
        <Header onMenuClick={mockOnMenuClick} />
      </TestWrapper>
    );

    expect(mockLoadUser).toHaveBeenCalled();
  });
});

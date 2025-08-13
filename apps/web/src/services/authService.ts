export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
  lastLogin: Date | null;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    // TODO: Replace with actual API call
    const mockResponse: LoginResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '1',
        email: credentials.email,
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'admin',
        isActive: true,
        lastLogin: new Date(),
      },
    };

    localStorage.setItem(this.TOKEN_KEY, mockResponse.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, mockResponse.refresh_token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(mockResponse.user));

    return mockResponse;
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  async refreshToken(): Promise<LoginResponse> {
    // TODO: Replace with actual API call
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user found for token refresh');
    }
    return {
      access_token: 'new-mock-access-token',
      refresh_token: 'new-mock-refresh-token',
      user: currentUser,
    };
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roleId === role;
  }
}

export default new AuthService();

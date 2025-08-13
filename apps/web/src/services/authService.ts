import { env } from '../utils/env';

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
  // Using sessionStorage for enhanced security - tokens cleared when browser session ends
  // This reduces risk of token persistence across browser restarts
  private readonly TOKEN_KEY = env.AUTH_TOKEN_KEY;
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';

  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    // Input validation for security
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }
    if (typeof credentials.email !== 'string' || typeof credentials.password !== 'string') {
      throw new Error('Invalid credential format');
    }
    if (credentials.email.length > 320) {
      // RFC 5321 limit
      throw new Error('Email address too long');
    }
    if (credentials.password.length > 128) {
      // Reasonable limit
      throw new Error('Password too long');
    }
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

    sessionStorage.setItem(this.TOKEN_KEY, mockResponse.access_token);
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, mockResponse.refresh_token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(mockResponse.user));

    return mockResponse;
  }

  logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
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
    const userJson = sessionStorage.getItem(this.USER_KEY);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
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

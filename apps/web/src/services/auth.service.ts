import { api } from './api.client';
import { env } from '../utils/env';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    roleName: string;
    permissions: string[];
    isActive: boolean;
    lastLogin: string | null;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  isActive: boolean;
  lastLogin: string | null;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.auth.login(credentials);

    // Store token in sessionStorage
    if (response.data.accessToken) {
      sessionStorage.setItem(env.AUTH_TOKEN_KEY, response.data.accessToken);
      sessionStorage.setItem(env.AUTH_USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear session storage
      sessionStorage.removeItem(env.AUTH_TOKEN_KEY);
      sessionStorage.removeItem(env.AUTH_USER_KEY);
    }
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.auth.refresh();

    if (response.data.accessToken) {
      sessionStorage.setItem(env.AUTH_TOKEN_KEY, response.data.accessToken);
      sessionStorage.setItem(env.AUTH_USER_KEY, JSON.stringify(response.data.user));
    }

    return response.data;
  },

  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem(env.AUTH_USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return sessionStorage.getItem(env.AUTH_TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roleName === role || false;
  },
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService, { User } from '../services/authService';

export interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (_credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  loadUser: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const user = authService.getCurrentUser();
          set({
            user,
            token: response.access_token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set({ user: null, token: null, error: null });
      },

      refreshToken: async () => {
        set({ isLoading: true });
        try {
          const response = await authService.refreshToken();
          const user = authService.getCurrentUser();
          set({
            user,
            token: response.access_token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Token refresh failed',
            user: null,
            token: null,
          });
          throw error;
        }
      },

      loadUser: () => {
        const user = authService.getCurrentUser();
        const token = authService.getAccessToken();
        set({ user, token });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const navigate = useNavigate();
  const {
    user,
    token,
    isLoading,
    error,
    login,
    logout: storeLogout,
    refreshToken,
    loadUser,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    // Load user from localStorage on mount
    if (!user && !isLoading) {
      loadUser();
    }
  }, [user, isLoading, loadUser]);

  const logout = () => {
    storeLogout();
    navigate('/login');
  };

  const isAuthenticated = !!user && !!token;

  const hasRole = () => {
    // This would need to be implemented based on your role system
    // For now, just check if user exists
    return !!user;
  };

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    hasRole,
    clearError,
  };
}

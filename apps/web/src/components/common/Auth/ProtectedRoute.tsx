import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../../services/auth.service';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to='/login' state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

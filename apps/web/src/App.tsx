import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/common/Feedback/ErrorBoundary';
import { AppLayout } from './components/common/Layout/AppLayout';
import { PublicLayout } from './components/common/Layout/PublicLayout';
import { ProtectedRoute } from './components/common/Auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EquipmentPage } from './pages/plcs/EquipmentPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route
          path='/login'
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
        />

        {/* Protected routes */}
        <Route
          path='/'
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path='/equipment'
          element={
            <ProtectedRoute>
              <AppLayout>
                <EquipmentPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 route */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/common/Feedback/ErrorBoundary';
import { AppLayout } from './components/common/Layout/AppLayout';
import { PublicLayout } from './components/common/Layout/PublicLayout';
import { ProtectedRoute } from './components/common/Auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EquipmentListPage } from './pages/equipment/EquipmentListPage';
import EquipmentCreatePage from './pages/equipment/EquipmentCreatePage';
import EquipmentEditPage from './pages/equipment/EquipmentEditPage';
// import { ImportExportPage } from './pages/import-export/ImportExportPage';
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
                <EquipmentListPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path='/equipment/new'
          element={
            <ProtectedRoute>
              <EquipmentCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/equipment/:id/edit'
          element={
            <ProtectedRoute>
              <EquipmentEditPage />
            </ProtectedRoute>
          }
        />

        <Route
          path='/equipment/:id'
          element={
            <ProtectedRoute>
              <AppLayout>
                <EquipmentListPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Import/Export route - uncomment after installing react-dropzone dependency */}
        {/* <Route
          path='/import-export'
          element={
            <ProtectedRoute>
              <AppLayout>
                <ImportExportPage />
              </AppLayout>
            </ProtectedRoute>
          }
        /> */}

        {/* 404 route */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

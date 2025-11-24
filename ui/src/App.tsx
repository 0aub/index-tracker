import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ManagementRoute from './components/auth/ManagementRoute';
import Login from './pages/Login';
import MainLayout from './components/common/MainLayout';
import Indices from './pages/Indices';
import IndexCreate from './pages/IndexCreate';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Requirements from './pages/Requirements';
import RequirementDetail from './pages/RequirementDetail';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';
import ServerError from './pages/ServerError';
import FirstTimeSetup from './pages/FirstTimeSetup';
import OrganizationHierarchy from './pages/OrganizationHierarchy';
import { useUIStore } from './stores/uiStore';

function App() {
  const { theme } = useUIStore();

  // Apply dark class to document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* First-Time Setup (Protected but outside MainLayout) */}
          <Route
            path="/first-time-setup"
            element={
              <ProtectedRoute>
                <FirstTimeSetup />
              </ProtectedRoute>
            }
          />

          {/* Error Pages */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="/500" element={<ServerError />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/index" replace />} />
            <Route path="index" element={<Indices />} />
            <Route path="index/new" element={<IndexCreate />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="requirements" element={<Requirements />} />
            <Route path="requirements/:id" element={<RequirementDetail />} />
            {/* Tasks page - Only accessible to management team (index_manager, section_coordinator, admin) */}
            <Route
              path="tasks"
              element={
                <ManagementRoute>
                  <Tasks />
                </ManagementRoute>
              }
            />
            <Route path="users" element={<Users />} />
            {/* Organization Hierarchy - Admin only */}
            <Route path="organization-hierarchy" element={<OrganizationHierarchy />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* 404 - Not Found (must be last) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

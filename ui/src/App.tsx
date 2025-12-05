import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ManagementRoute from './components/auth/ManagementRoute';
import OwnerRoute from './components/auth/OwnerRoute';
import AdminRoute from './components/auth/AdminRoute';
import Login from './pages/Login';
import MainLayout from './components/common/MainLayout';
import Home from './pages/Home';
import Indices from './pages/Indices';
import IndexCreate from './pages/IndexCreate';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Requirements from './pages/Requirements';
import RequirementDetail from './pages/RequirementDetail';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';
import ServerError from './pages/ServerError';
import FirstTimeSetup from './pages/FirstTimeSetup';
import OrganizationHierarchy from './pages/OrganizationHierarchy';
import KnowledgeCenter from './pages/KnowledgeCenter';
import Support from './pages/Support';
import EvidenceManagement from './pages/EvidenceManagement';
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
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            {/* Index Management - Only accessible to admin and owners */}
            <Route
              path="index"
              element={
                <OwnerRoute>
                  <Indices />
                </OwnerRoute>
              }
            />
            <Route
              path="index/new"
              element={
                <OwnerRoute>
                  <IndexCreate />
                </OwnerRoute>
              }
            />
            <Route path="dashboard" element={<Dashboard />} />
            {/* Reports - Only accessible to admin and owners */}
            <Route
              path="reports"
              element={
                <OwnerRoute>
                  <Reports />
                </OwnerRoute>
              }
            />
            {/* Requirements - Accessible to all authenticated users */}
            <Route path="requirements" element={<Requirements />} />
            <Route path="requirements/:id" element={<RequirementDetail />} />
            {/* Tasks page - Accessible to all authenticated users (backend filters by role) */}
            <Route path="tasks" element={<Tasks />} />
            {/* Knowledge Center - Accessible to all authenticated users (only shows for ETARI indexes) */}
            <Route path="knowledge" element={<KnowledgeCenter />} />
            {/* Support - Accessible to all authenticated users (only shows for ETARI indexes) */}
            <Route path="support" element={<Support />} />
            {/* Evidence Management - Accessible to all authenticated users (only shows for ETARI indexes) */}
            <Route path="evidence-management" element={<EvidenceManagement />} />
            {/* Notifications page - Accessible to all authenticated users */}
            <Route path="notifications" element={<Notifications />} />
            {/* Users - Only accessible to admin and owners */}
            <Route
              path="users"
              element={
                <OwnerRoute>
                  <Users />
                </OwnerRoute>
              }
            />
            {/* Organization Hierarchy - Admin only */}
            <Route
              path="organization-hierarchy"
              element={
                <AdminRoute>
                  <OrganizationHierarchy />
                </AdminRoute>
              }
            />
            {/* Settings - Accessible to all authenticated users */}
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

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Route protection for admin-only pages (Organization Hierarchy)
 * Only accessible to: admin role
 * Other users are redirected to 403 Forbidden page
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user } = useAuthStore();

  // Check if user has admin access
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    // Redirect to forbidden page for non-admin users
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

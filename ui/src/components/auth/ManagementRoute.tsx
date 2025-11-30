import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ManagementRouteProps {
  children: ReactNode;
}

/**
 * Route protection for management-only pages (Tasks page)
 * Only accessible to: index_manager, section_coordinator, and admin roles
 * Contributors are redirected to 403 Forbidden page
 */
const ManagementRoute = ({ children }: ManagementRouteProps) => {
  const { user } = useAuthStore();

  // Check if user has management access
  const isManagement = user?.role === 'INDEX_MANAGER' ||
                       user?.role === 'SECTION_COORDINATOR' ||
                       user?.role === 'ADMIN';

  if (!isManagement) {
    // Redirect to forbidden page for non-management users
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ManagementRoute;

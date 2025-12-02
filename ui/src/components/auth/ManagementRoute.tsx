import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useIndexStore } from '../../stores/indexStore';

interface ManagementRouteProps {
  children: ReactNode;
}

/**
 * Route protection for management-only pages (Tasks page)
 * Only accessible to:
 * - System ADMIN (global role)
 * - Users with OWNER or SUPERVISOR role in the current index (per-index roles)
 * Regular contributors are redirected to 403 Forbidden page
 */
const ManagementRoute = ({ children }: ManagementRouteProps) => {
  const { user } = useAuthStore();
  const { currentIndex } = useIndexStore();

  // Check if user is system admin (global role)
  const isAdmin = user?.role === 'ADMIN';

  // Check if user has owner/supervisor role in the current index (per-index roles)
  const isIndexOwnerOrSupervisor = currentIndex?.user_role === 'OWNER' || currentIndex?.user_role === 'SUPERVISOR';

  // Allow access if user is admin or has management role in current index
  if (!isAdmin && !isIndexOwnerOrSupervisor) {
    // Redirect to forbidden page for users without management access
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ManagementRoute;

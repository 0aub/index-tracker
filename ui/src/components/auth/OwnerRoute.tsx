import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useIndexStore } from '../../stores/indexStore';

interface OwnerRouteProps {
  children: ReactNode;
}

/**
 * Route protection for owner-only pages (Index, Users, Reports)
 * Only accessible to:
 * - System ADMIN (global role)
 * - Users with OWNER role in the current index (per-index roles)
 * Supervisors and contributors are redirected to 403 Forbidden page
 */
const OwnerRoute = ({ children }: OwnerRouteProps) => {
  const { user } = useAuthStore();
  const { currentIndex } = useIndexStore();

  // Check if user is system admin (global role)
  const isAdmin = user?.role === 'ADMIN';

  // Check if user has owner role in the current index (per-index roles)
  const isIndexOwner = currentIndex?.user_role === 'OWNER';

  // Allow access only if user is admin or owner
  if (!isAdmin && !isIndexOwner) {
    // Redirect to forbidden page for users without owner access
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default OwnerRoute;

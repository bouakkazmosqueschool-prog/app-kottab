import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function RequireAuth() {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  }
  return <Outlet />;
}

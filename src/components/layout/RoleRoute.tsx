import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getTeacherRole } from '../../data/teachers';
import type { TeacherRole } from '../../types';

/**
 * يحمي مجموعة مسارات حسب الدور. الدور يُشتقّ من اسم المستخدم (مرجع موثوق)
 * لا من الجلسة المحفوظة، تفادياً لأي جلسة قديمة بلا حقل الدور.
 */
export function RoleRoute({ allow }: { allow: TeacherRole[] }) {
  const session = useAuthStore((s) => s.session);
  const role = getTeacherRole(session?.teacherName);
  if (!session) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

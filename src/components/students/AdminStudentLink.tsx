import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { isSuperTeacher } from '../../data/teachers';

/** Add profile navigation for the administrator without changing other roles' actions. */
export function AdminStudentLink({ studentId, children, className = '' }: {
  studentId?: string;
  children: ReactNode;
  className?: string;
}) {
  const teacherName = useAuthStore((s) => s.session?.teacherName);
  if (!studentId || !isSuperTeacher(teacherName)) return <span className={className}>{children}</span>;
  return <Link to={`/students/${encodeURIComponent(studentId)}`}
    className={`hover:text-bordeaux hover:underline underline-offset-4 transition-colors print:no-underline ${className}`}>
    {children}
  </Link>;
}

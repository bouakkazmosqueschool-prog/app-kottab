import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  ClipboardCheck,
  BarChart3,
  Wallet,
  Receipt,
  CalendarCheck,
  LogOut,
  X,
  Palette,
} from 'lucide-react';
import clsx from 'clsx';
import type { TeacherRole } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { HALQA_LABELS } from '../../lib/constants';
import { getTeacherRole, ROLE_LABELS } from '../../data/teachers';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: TeacherRole[] };

const ALL: TeacherRole[] = ['teacher', 'super_admin', 'supervisor'];
const ACADEMIC: TeacherRole[] = ['teacher', 'super_admin'];

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ALL },
  { to: '/students', label: 'الطلاب', icon: Users, roles: ALL },
  { to: '/attendance', label: 'الحضور والغياب', icon: CalendarCheck, roles: ALL },
  { to: '/goals', label: 'الأهداف', icon: Target, roles: ACADEMIC },
  { to: '/achievements', label: 'تسجيل الإنجاز', icon: ClipboardCheck, roles: ACADEMIC },
  { to: '/reports', label: 'التقارير', icon: BarChart3, roles: ACADEMIC },
  { to: '/payments', label: 'تسجيل الأداءات', icon: Wallet, roles: ['supervisor'] },
  { to: '/payments-report', label: 'تقرير الأداءات', icon: Receipt, roles: ALL },
  { to: '/appearance', label: 'المظهر والألوان', icon: Palette, roles: ALL },
];

function Logo({ schoolName }: { schoolName: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <img src="/logo.png" alt="" className="w-10 h-10 shrink-0 rounded-lg object-contain bg-cream/95 p-0.5" />
      <p className="sidebar-title font-display text-sm font-bold leading-snug line-clamp-2 min-w-0">{schoolName}</p>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const session = useAuthStore((s) => s.session);
  const role = getTeacherRole(session?.teacherName);
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              isActive && 'is-active',
            )
          }
        >
          <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2.25} />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function SessionFooter() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!session) return null;

  return (
    <div className="sidebar-footer px-3 pt-3 border-t mt-2 flex flex-col gap-2">
      <div className="px-2">
        <p className="sidebar-title text-sm font-semibold truncate">{session.teacherName}</p>
        <p className="sidebar-caption text-[11px]">
          {getTeacherRole(session.teacherName) === 'supervisor'
            ? ROLE_LABELS.supervisor
            : HALQA_LABELS[session.halqa]}
        </p>
      </div>
      <button
        onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}
        className="sidebar-secondary-button flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors w-fit"
      >
        <LogOut className="w-3.5 h-3.5" />
        تسجيل الخروج
      </button>
    </div>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const schoolName = useSettingsStore((s) => s.settings.schoolName);

  return (
    <>
      {/* عرض سطح المكتب */}
      <aside className="app-sidebar no-print hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 py-5">
        <Logo schoolName={schoolName} />
        <div className="sidebar-divider h-px my-4 mx-3" />
        <NavList />
        <SessionFooter />
      </aside>

      {/* تيرو الجوال */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="app-sidebar absolute inset-y-0 start-0 w-72 max-w-[85vw] flex flex-col py-5 motion-safe:animate-[slideInStart_200ms_ease-out]">
            <div className="flex items-center justify-between px-2 gap-2">
              <Logo schoolName={schoolName} />
              <button
                onClick={onCloseMobile}
                aria-label="إغلاق القائمة"
                className="sidebar-secondary-button h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="sidebar-divider h-px my-4 mx-3" />
            <NavList onNavigate={onCloseMobile} />
            <SessionFooter />
          </aside>
        </div>
      )}
    </>
  );
}

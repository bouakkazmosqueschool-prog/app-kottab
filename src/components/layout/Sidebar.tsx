import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  ClipboardCheck,
  BarChart3,
  LogOut,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { HALQA_LABELS } from '../../lib/constants';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'التلاميذ', icon: Users },
  { to: '/goals', label: 'الأهداف', icon: Target },
  { to: '/achievements', label: 'تسجيل الإنجاز', icon: ClipboardCheck },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
];

function Logo({ schoolName }: { schoolName: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <img src="/logo.png" alt="" className="w-10 h-10 shrink-0 rounded-lg object-contain bg-cream/95 p-0.5" />
      <p className="font-display text-sm font-bold text-cream leading-snug line-clamp-2 min-w-0">{schoolName}</p>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              isActive ? 'bg-gold text-bordeaux-dark' : 'text-cream/80 hover:bg-cream/10 hover:text-cream',
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
    <div className="px-3 pt-3 border-t border-cream/10 mt-2 flex flex-col gap-2">
      <div className="px-2">
        <p className="text-sm font-semibold text-cream truncate">{session.teacherName}</p>
        <p className="text-[11px] text-gold">{HALQA_LABELS[session.halqa]}</p>
      </div>
      <button
        onClick={() => {
          logout();
          navigate('/login', { replace: true });
        }}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-cream/70 hover:bg-cream/10 hover:text-cream transition-colors w-fit"
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
      <aside className="no-print hidden lg:flex flex-col w-64 shrink-0 bg-bordeaux h-screen sticky top-0 py-5">
        <Logo schoolName={schoolName} />
        <div className="h-px bg-cream/10 my-4 mx-3" />
        <NavList />
        <SessionFooter />
      </aside>

      {/* تيرو الجوال */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] bg-bordeaux flex flex-col py-5 motion-safe:animate-[slideInStart_200ms_ease-out]">
            <div className="flex items-center justify-between px-2 gap-2">
              <Logo schoolName={schoolName} />
              <button
                onClick={onCloseMobile}
                aria-label="إغلاق القائمة"
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-cream/70 hover:bg-cream/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-px bg-cream/10 my-4 mx-3" />
            <NavList onNavigate={onCloseMobile} />
            <SessionFooter />
          </aside>
        </div>
      )}
    </>
  );
}

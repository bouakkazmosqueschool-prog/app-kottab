import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  BookMarked,
  Settings,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useSettingsStore } from '../../store/settingsStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/students', label: 'التلاميذ', icon: Users },
  { to: '/goals', label: 'الأهداف', icon: Target },
  { to: '/achievements', label: 'تسجيل الإنجاز', icon: ClipboardCheck },
  { to: '/memorization', label: 'سجل الحفظ', icon: BookOpen },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/surahs', label: 'السور', icon: BookMarked },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

function Logo({ schoolName }: { schoolName: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <svg viewBox="0 0 64 64" className="w-9 h-9 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="var(--color-gold)" />
        <g transform="translate(32,32)">
          <path d="M0,-22 L6,-6 L22,0 L6,6 L0,22 L-6,6 L-22,0 L-6,-6 Z" fill="var(--color-cream)" />
          <circle r="4.5" fill="var(--color-bordeaux)" />
        </g>
      </svg>
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

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const schoolName = useSettingsStore((s) => s.settings.schoolName);

  return (
    <>
      {/* عرض سطح المكتب */}
      <aside className="no-print hidden lg:flex flex-col w-64 shrink-0 bg-bordeaux h-screen sticky top-0 py-5">
        <Logo schoolName={schoolName} />
        <div className="h-px bg-cream/10 my-4 mx-3" />
        <NavList />
        <div className="px-5 pt-3 text-[11px] text-cream/40 border-t border-cream/10 mt-2">نسخة تجريبية محلية</div>
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
          </aside>
        </div>
      )}
    </>
  );
}

import { Menu } from 'lucide-react';
import { formatLongDate, todayISO } from '../../lib/dates';
import { useAuthStore } from '../../store/authStore';

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const teacherName = useAuthStore((s) => s.session?.teacherName);

  return (
    <header className="no-print sticky top-0 z-30 flex items-center gap-3 bg-cream/90 backdrop-blur border-b border-line px-4 md:px-8 py-3.5">
      <button
        onClick={onOpenMobile}
        aria-label="فتح القائمة"
        className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-ink hover:bg-ink/5 shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{teacherName ? `مرحباً، ${teacherName}` : 'مرحباً بك'}</p>
        <p className="text-xs text-ink-soft truncate">{formatLongDate(todayISO())}</p>
      </div>
    </header>
  );
}

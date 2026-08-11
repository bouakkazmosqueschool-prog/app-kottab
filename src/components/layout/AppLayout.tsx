import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useStudentsStore } from '../../store/studentsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { useMemorizationStore } from '../../store/memorizationStore';
import { useSettingsStore } from '../../store/settingsStore';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const studentsInitialized = useStudentsStore((s) => s.initialized);
  const goalsInitialized = useGoalsStore((s) => s.initialized);
  const memorizationInitialized = useMemorizationStore((s) => s.initialized);
  const settingsInitialized = useSettingsStore((s) => s.initialized);
  const ready = studentsInitialized && goalsInitialized && memorizationInitialized && settingsInitialized;

  const studentsError = useStudentsStore((s) => s.error);
  const goalsError = useGoalsStore((s) => s.error);
  const memorizationError = useMemorizationStore((s) => s.error);
  const settingsError = useSettingsStore((s) => s.error);
  const loadError = studentsError || goalsError || memorizationError || settingsError;

  useEffect(() => {
    useStudentsStore.getState().init();
    useGoalsStore.getState().init();
    useMemorizationStore.getState().init();
    useSettingsStore.getState().init();
  }, []);

  if (loadError && !ready) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-display font-bold text-ink">تعذّر تحميل البيانات</p>
        <p className="text-sm text-clay max-w-md">{loadError}</p>
        <p className="text-xs text-ink-soft">تحقق من إعداد Supabase (متغيرات البيئة) ومن الاتصال بالإنترنت.</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-bordeaux animate-spin" />
        <p className="text-sm text-ink-soft">جارٍ تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

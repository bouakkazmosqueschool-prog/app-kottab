import { Check, Moon, Sun, Palette } from 'lucide-react';
import { APP_THEMES } from '../data/themes';
import type { AppTheme } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { Card, Chip, SectionHeader } from '../components/ui/Primitives';

export default function AppearancePage() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return <div className="max-w-4xl flex flex-col gap-6">
    <SectionHeader title="المظهر والألوان" subtitle="اختر ألوان التطبيق التي تريحك. يُحفظ اختيارك تلقائياً على هذا الجهاز." />
    <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><Palette className="size-5 text-bordeaux" /><h2 className="font-display font-bold text-ink">وضع العرض</h2></div>
      <div className="flex gap-2">
        <Chip active={!settings.darkMode} onClick={() => void updateSettings({ darkMode: false })}><span className="flex items-center gap-2"><Sun className="size-4" /> نهاري</span></Chip>
        <Chip active={settings.darkMode} onClick={() => void updateSettings({ darkMode: true })}><span className="flex items-center gap-2"><Moon className="size-4" /> ليلي</span></Chip>
      </div>
    </Card>
    <fieldset>
      <legend className="sr-only">اختيار سمة الألوان</legend>
      <div className="grid sm:grid-cols-2 gap-4">
        {(Object.keys(APP_THEMES) as AppTheme[]).map((id) => {
          const theme = APP_THEMES[id];
          const p = theme[settings.darkMode ? 'dark' : 'light'];
          const selected = (settings.theme ?? 'classic') === id;
          return <label key={id} className="relative cursor-pointer min-w-0">
            <input type="radio" name="appearance-theme" value={id} checked={selected}
              onChange={() => void updateSettings({ theme: id })} className="peer sr-only" />
            <div className={`h-full rounded-2xl border-2 p-4 bg-paper transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-gold-dark ${selected ? 'border-bordeaux' : 'border-line hover:border-bordeaux/40'}`}>
              <div aria-hidden="true" className="h-36 rounded-xl border overflow-hidden flex" style={{ background: p.background, borderColor: p.border }}>
                <div className="w-16 shrink-0 p-2 flex flex-col gap-2" style={{ background: p.sidebar }}>
                  <div className="size-5 rounded-md mb-1" style={{ background: p.sidebarText, opacity: 0.7 }} />
                  <div className="h-2.5 rounded-sm" style={{ background: p.sidebarActive }} />
                  <div className="h-1.5 w-8 rounded-sm" style={{ background: p.sidebarText, opacity: 0.35 }} />
                  <div className="h-1.5 w-9 rounded-sm" style={{ background: p.sidebarText, opacity: 0.35 }} />
                </div>
                <div className="flex-1 p-3 min-w-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold" style={{ color: p.text }}>الطلاب</span><div className="h-4 w-10 rounded" style={{ background: p.primary }} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map((n) => <div key={n} className="rounded-lg border p-2 flex flex-col gap-2" style={{ background: p.surface, borderColor: p.border }}>
                      <div className="size-5 rounded-full" style={{ background: p.primary, opacity: 0.18 }} />
                      <div className="h-1.5 w-full rounded-sm" style={{ background: p.text, opacity: 0.45 }} />
                      <div className="h-1.5 w-3/4 rounded-sm" style={{ background: p.muted, opacity: 0.3 }} />
                    </div>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-4">
                <div><h3 className="font-semibold text-ink">{theme.name}</h3><p className="text-xs text-ink-soft mt-1" dir="ltr">{theme.frenchName}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  {id === 'classic' && <span className="text-[11px] rounded-full px-2 py-0.5 bg-ink/5 text-ink-soft">الافتراضي</span>}
                  <span className={`size-6 rounded-full border flex items-center justify-center ${selected ? 'bg-bordeaux border-bordeaux text-cream' : 'border-line'}`}>{selected && <Check className="size-3.5" />}</span>
                </div>
              </div>
            </div>
          </label>;
        })}
      </div>
    </fieldset>
    <p role="status" className="text-sm text-ink-soft">السمة الحالية: {APP_THEMES[settings.theme ?? 'classic'].name} — محفوظة تلقائياً</p>
  </div>;
}

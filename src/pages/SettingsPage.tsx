import { useState } from 'react';
import { Moon, Sun, Download, Save } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import type { PeriodType } from '../types';
import { PERIOD_TYPE_LABELS } from '../lib/constants';
import { todayISO } from '../lib/dates';
import { buildExportSnapshot, downloadJSON } from '../lib/dataManagement';
import { SectionHeader, Card, Button, Chip } from '../components/ui/Primitives';
import { FormField, TextInput, Select } from '../components/ui/Field';

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [saved, setSaved] = useState(false);

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings({ schoolName: schoolName.trim() || settings.schoolName });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    downloadJSON(`نسخة-احتياطية-كُتّاب-${todayISO()}.json`, buildExportSnapshot());
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <SectionHeader title="الإعدادات" subtitle="معلومات الكُتّاب والمظهر" />

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">معلومات الكُتّاب</h3>
        <p className="text-xs text-ink-soft mb-4">هذه الإعدادات مشتركة بين جميع الأساتذة (محفوظة في قاعدة البيانات).</p>
        <form onSubmit={handleSaveIdentity} className="flex flex-col gap-4">
          <FormField label="اسم الكُتّاب">
            <TextInput value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </FormField>
          <FormField label="نوع الفترة الافتراضي">
            <Select
              value={settings.defaultPeriodType}
              onChange={(e) => updateSettings({ defaultPeriodType: e.target.value as PeriodType })}
            >
              {(['week', 'month', 'custom'] as PeriodType[]).map((pt) => (
                <option key={pt} value={pt}>
                  {PERIOD_TYPE_LABELS[pt]}
                </option>
              ))}
            </Select>
          </FormField>
          <Button type="submit" icon={<Save className="w-4 h-4" />} className="w-fit">
            {saved ? 'تم الحفظ ✓' : 'حفظ التغييرات'}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-1">المظهر</h3>
        <p className="text-xs text-ink-soft mb-4">تفضيل شخصي محفوظ في هذا المتصفح فقط.</p>
        <div className="flex gap-2">
          <Chip active={!settings.darkMode} onClick={() => updateSettings({ darkMode: false })}>
            <span className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" /> فاتح
            </span>
          </Chip>
          <Chip active={settings.darkMode} onClick={() => updateSettings({ darkMode: true })}>
            <span className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5" /> داكن
            </span>
          </Chip>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-1">نسخة احتياطية</h3>
        <p className="text-xs text-ink-soft mb-4">
          البيانات الفعلية محفوظة في Supabase. هذا التصدير للأرشفة فقط (JSON للقراءة)، وليس أداة استعادة.
        </p>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
          تصدير نسخة احتياطية (JSON)
        </Button>
      </Card>
    </div>
  );
}

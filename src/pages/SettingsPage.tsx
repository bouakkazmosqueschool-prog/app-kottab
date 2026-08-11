import { useRef, useState } from 'react';
import { Moon, Sun, Download, Upload, RotateCcw, Save } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import type { PeriodType } from '../types';
import { PERIOD_TYPE_LABELS } from '../lib/constants';
import { todayISO } from '../lib/dates';
import { buildExportBundle, applyImportedBundle, isValidDataBundle, downloadJSON, resetAllToSeed } from '../lib/dataManagement';
import { SectionHeader, Card, Button, Chip } from '../components/ui/Primitives';
import { FormField, TextInput, Select } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/Modal';

export default function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    updateSettings({ schoolName: schoolName.trim() || settings.schoolName, teacherName: teacherName.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    downloadJSON(`نسخة-احتياطية-كُتّاب-${todayISO()}.json`, buildExportBundle());
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidDataBundle(parsed)) {
        setImportMessage({ type: 'error', text: 'الملف غير صالح أو لا يحتوي على البيانات المطلوبة.' });
        return;
      }
      applyImportedBundle(parsed);
      setImportMessage({ type: 'success', text: 'تم استيراد البيانات بنجاح.' });
    } catch {
      setImportMessage({ type: 'error', text: 'تعذّر قراءة الملف. تأكد من أنه ملف JSON صالح.' });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <SectionHeader title="الإعدادات" subtitle="معلومات الكُتّاب والمظهر وإدارة البيانات" />

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">معلومات الكُتّاب</h3>
        <form onSubmit={handleSaveIdentity} className="flex flex-col gap-4">
          <FormField label="اسم الكُتّاب">
            <TextInput value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </FormField>
          <FormField label="اسم الأستاذ/ة">
            <TextInput value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="اختياري" />
          </FormField>
          <FormField label="نوع الفترة الافتراضي">
            <Select value={settings.defaultPeriodType} onChange={(e) => updateSettings({ defaultPeriodType: e.target.value as PeriodType })}>
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
        <h3 className="font-display font-bold text-ink mb-4">المظهر</h3>
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
        <h3 className="font-display font-bold text-ink mb-1">إدارة البيانات</h3>
        <p className="text-xs text-ink-soft mb-4">جميع البيانات محفوظة محلياً في هذا المتصفح فقط.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            تصدير نسخة احتياطية (JSON)
          </Button>
          <Button variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={handleImportClick}>
            استيراد نسخة احتياطية
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          <Button variant="danger" icon={<RotateCcw className="w-4 h-4" />} onClick={() => setResetOpen(true)}>
            إعادة تعيين إلى البيانات التجريبية
          </Button>
        </div>
        {importMessage && (
          <p className={`text-sm mt-3 font-medium ${importMessage.type === 'success' ? 'text-teal' : 'text-clay'}`}>{importMessage.text}</p>
        )}
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetAllToSeed}
        title="إعادة التعيين"
        message="سيتم استبدال كل التلاميذ والأهداف وسجلّات الحفظ الحالية بالبيانات التجريبية الأصلية. لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="إعادة التعيين"
        danger
      />
    </div>
  );
}

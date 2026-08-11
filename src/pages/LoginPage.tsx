import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Repeat, PenLine, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { Halqa } from '../types';
import { HALQA_LABELS } from '../lib/constants';
import { TEACHERS } from '../data/teachers';
import { Card, Button } from '../components/ui/Primitives';
import { FormField, TextInput, Select } from '../components/ui/Field';

const HALQA_OPTIONS: { halqa: Halqa; icon: typeof BookOpen; description: string }[] = [
  { halqa: 'hifz', icon: BookOpen, description: 'متابعة حفظ الآيات الجديدة' },
  { halqa: 'murajaa', icon: Repeat, description: 'متابعة مراجعة وتثبيت المحفوظ' },
  { halqa: 'alwah', icon: PenLine, description: 'متابعة كتابة وتصحيح الألواح' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const chooseHalqa = useAuthStore((s) => s.chooseHalqa);
  const pendingTeacher = useAuthStore((s) => s.pendingTeacher);

  const [name, setName] = useState(TEACHERS[0]?.name ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(name, password);
    if (!ok) {
      setError('اسم المعلم أو كلمة المرور غير صحيحة');
      return;
    }
    setError('');
  }

  function handleChooseHalqa(halqa: Halqa) {
    chooseHalqa(halqa);
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <img src="/logo.png" alt="" className="w-20 h-20 object-contain" />
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-ink">كُتّاب مسجد بوعكاز القديم</h1>
          <p className="text-sm text-ink-soft mt-1">منصة تتبع الحفظ والمراجعة والألواح</p>
        </div>

        {!pendingTeacher ? (
          <Card className="w-full p-6">
            <h2 className="font-display font-bold text-ink mb-4">تسجيل دخول المعلم</h2>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <FormField label="اسم المعلم" required>
                <Select value={name} onChange={(e) => setName(e.target.value)} autoFocus>
                  {TEACHERS.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="كلمة المرور" required error={error}>
                <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" />
              </FormField>
              <Button type="submit" icon={<LogIn className="w-4 h-4" />} fullWidth>
                دخول
              </Button>
            </form>
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-xs text-ink-soft">
                حسابات تجريبية — كلمة المرور لجميع الحسابات: <span className="font-semibold text-ink">1234</span>
              </p>
            </div>
          </Card>
        ) : (
          <Card className="w-full p-6">
            <h2 className="font-display font-bold text-ink mb-1">مرحباً {pendingTeacher.name}</h2>
            <p className="text-sm text-ink-soft mb-5">اختر الحلقة التي ستتابعها في هذه الجلسة</p>
            <div className="flex flex-col gap-3">
              {HALQA_OPTIONS.map(({ halqa, icon: Icon, description }) => (
                <button
                  key={halqa}
                  onClick={() => handleChooseHalqa(halqa)}
                  className="flex items-center gap-4 p-4 rounded-xl border border-line hover:border-bordeaux/50 hover:bg-bordeaux/4 transition-colors text-start"
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-bordeaux/8 text-bordeaux-dark flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{HALQA_LABELS[halqa]}</p>
                    <p className="text-xs text-ink-soft">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

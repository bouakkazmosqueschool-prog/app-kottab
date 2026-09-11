import { useMemo, useState } from 'react';
import { Wallet, Check, CheckCircle2 } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { usePaymentsStore } from '../store/paymentsStore';
import { SectionHeader, Card, Button, Chip } from '../components/ui/Primitives';
import { Select, NumberInput } from '../components/ui/Field';
import { MultiSelect } from '../components/ui/MultiSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { currentMonthPeriod, formatMonthPeriod, formatShortDate, monthPeriodsUpToNow } from '../lib/dates';
import { formatMoney } from '../lib/constants';

export default function PaymentsPage() {
  const students = useStudentsStore((s) => s.students);
  const payments = usePaymentsStore((s) => s.payments);
  const recordPayment = usePaymentsStore((s) => s.recordPayment);

  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState<string[]>([currentMonthPeriod()]);
  const [saving, setSaving] = useState(false);

  // مبالغ سريعة شائعة + إمكانية إدخال مبلغ حرّ
  const AMOUNT_PRESETS = [50, 100, 150, 200];

  const activeStudents = useMemo(
    () => students.filter((s) => s.active).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar')),
    [students],
  );

  const selectedStudent = activeStudents.find((s) => s.id === studentId);

  const studentPayments = useMemo(
    () => payments.filter((p) => p.studentId === studentId).sort((a, b) => (a.period < b.period ? 1 : -1)),
    [payments, studentId],
  );
  const paidPeriods = useMemo(() => new Set(studentPayments.map((p) => p.period)), [studentPayments]);

  // خيارات الأشهر: من أقدم شهر مسجَّل إلى الشهر الحالي، مع تمييز المؤدّى منها
  const monthOptions = useMemo(() => {
    const periods = monthPeriodsUpToNow(Array.from(new Set(payments.map((p) => p.period))));
    return periods.map((p) => ({
      value: p,
      label: paidPeriods.has(p) ? `${formatMonthPeriod(p)} (مؤدّى)` : formatMonthPeriod(p),
    }));
  }, [payments, paidPeriods]);

  const amountNum = Number(amount);
  const canSave = !!studentId && months.length > 0 && amount !== '' && !Number.isNaN(amountNum) && amountNum >= 0;
  const perMonth = canSave && months.length > 0 ? amountNum / months.length : null;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await recordPayment(studentId, months, amountNum);
    setSaving(false);
    setAmount('');
    setMonths([currentMonthPeriod()]);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="تسجيل الأداءات" subtitle="اختر التلميذ، أدخل المبلغ، وحدّد الأشهر التي يغطّيها" />

      <Card className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold text-ink block mb-1.5">التلميذ</label>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">— اختر تلميذاً —</option>
            {activeStudents.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.studentNumber} {s.fullName}
              </option>
            ))}
          </Select>
        </div>

        {selectedStudent && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-ink block mb-1.5">المبلغ (درهم)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {AMOUNT_PRESETS.map((v) => (
                    <Chip key={v} active={Number(amount) === v} onClick={() => setAmount(String(v))}>
                      {v}
                    </Chip>
                  ))}
                </div>
                <NumberInput value={amount} min={0} step="any" placeholder="مبلغ حرّ" onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink block mb-1.5">الأشهر المؤدّاة</label>
                <MultiSelect options={monthOptions} selected={months} onChange={setMonths} placeholder="اختر الأشهر" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-soft">
                {perMonth !== null && months.length > 1
                  ? `${formatMoney(amountNum)} على ${months.length} أشهر = ${formatMoney(perMonth)} لكل شهر`
                  : months.length === 1 && amount !== ''
                    ? `${formatMoney(amountNum || 0)} لشهر ${formatMonthPeriod(months[0])}`
                    : 'حدّد المبلغ والأشهر'}
              </p>
              <Button icon={<Check className="w-4 h-4" />} disabled={!canSave || saving} onClick={handleSave}>
                {saving ? 'جارٍ الحفظ...' : 'تسجيل الأداء'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {selectedStudent && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink mb-4">
            سجلّ أداءات {selectedStudent.fullName} ({studentPayments.length})
          </h3>
          {studentPayments.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد أداءات مسجَّلة بعد" />
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {studentPayments.map((p) => (
                <div key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0" />
                  <span className="text-sm font-semibold text-ink min-w-[120px]">{formatMonthPeriod(p.period)}</span>
                  <span className="text-sm text-ink tabular-nums">{formatMoney(p.amount)}</span>
                  <span className="text-xs text-ink-soft ms-auto">سُجّل في {formatShortDate(p.paidAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {!selectedStudent && (
        <Card>
          <EmptyState icon={Wallet} title="اختر تلميذاً للبدء" description="اختر تلميذاً من القائمة أعلاه لتسجيل أداءاته أو الاطّلاع على سجلّها." />
        </Card>
      )}
    </div>
  );
}

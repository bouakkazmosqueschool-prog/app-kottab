import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Check, CheckCircle2, Trash2 } from 'lucide-react';
import type { Payment } from '../types';
import { useStudentsStore } from '../store/studentsStore';
import { usePaymentsStore } from '../store/paymentsStore';
import { SectionHeader, Card, Button, Chip, IconButton } from '../components/ui/Primitives';
import { Select, NumberInput } from '../components/ui/Field';
import { MultiSelect } from '../components/ui/MultiSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import {
  addMonthsToPeriod,
  currentMonthPeriod,
  formatMonthPeriod,
  formatShortDate,
  monthPeriodOf,
  monthPeriodRange,
  parseISODate,
} from '../lib/dates';
import { formatMoney } from '../lib/constants';

/** عدد الأشهر المتاحة للدفع المُقدَّم (بعد الشهر الحالي) */
const ADVANCE_MONTHS = 6;

export default function PaymentsPage() {
  const students = useStudentsStore((s) => s.students);
  const payments = usePaymentsStore((s) => s.payments);
  const recordPayment = usePaymentsStore((s) => s.recordPayment);
  const removePayment = usePaymentsStore((s) => s.removePayment);

  const [searchParams] = useSearchParams();
  // اختيار مبدئي للتلميذ من رابط تقرير الأداءات (?student=)
  const [studentId, setStudentId] = useState(searchParams.get('student') ?? '');
  const [amount, setAmount] = useState('');
  const [months, setMonths] = useState<string[]>([currentMonthPeriod()]);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Payment | null>(null);

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

  // خيارات الأشهر للتلميذ المختار: الأشهر غير المؤدّاة فقط، من شهر التحاقه
  // إلى 6 أشهر مُقدَّمة بعد الشهر الحالي (لدفع أشهر قادمة سلفاً).
  const monthOptions = useMemo(() => {
    if (!selectedStudent) return [];
    const current = currentMonthPeriod();
    const joinMonth = monthPeriodOf(parseISODate(selectedStudent.joinDate));
    const start = joinMonth < current ? joinMonth : current;
    const end = addMonthsToPeriod(current, ADVANCE_MONTHS);
    return monthPeriodRange(start, end)
      .filter((p) => !paidPeriods.has(p))
      .map((p) => ({ value: p, label: p > current ? `${formatMonthPeriod(p)} (مُقدَّم)` : formatMonthPeriod(p) }));
  }, [selectedStudent, paidPeriods]);

  // عند تغيير التلميذ: نُفرّغ المبلغ ونضبط الشهر الحالي مبدئياً إن لم يكن مؤدّىً بعد
  useEffect(() => {
    setAmount('');
    const current = currentMonthPeriod();
    const studentPaid = new Set(payments.filter((p) => p.studentId === studentId).map((p) => p.period));
    setMonths(studentId && !studentPaid.has(current) ? [current] : []);
  }, [studentId, payments]);

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
            <div className="border-t border-line pt-4">
              <label className="text-sm font-semibold text-ink block mb-2">المبلغ (درهم)</label>
              <div className="flex flex-wrap items-center gap-2">
                {AMOUNT_PRESETS.map((v) => (
                  <Chip key={v} active={Number(amount) === v} onClick={() => setAmount(String(v))}>
                    {v}
                  </Chip>
                ))}
                <div className="w-32">
                  <NumberInput value={amount} min={0} step="any" placeholder="مبلغ حرّ" onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink block mb-2">أشهر الأداء</label>
              <MultiSelect options={monthOptions} selected={months} onChange={setMonths} placeholder="اختر الأشهر" searchable />
              <p className="text-[11px] text-ink-soft mt-1.5">الأشهر غير المؤدّاة فقط، حتى 6 أشهر مُقدَّمة.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
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
                  <span className="text-sm font-semibold text-ink min-w-[110px]">{formatMonthPeriod(p.period)}</span>
                  <span className="text-sm text-ink tabular-nums">{formatMoney(p.amount)}</span>
                  <span className="text-xs text-ink-soft ms-auto">سُجّل في {formatShortDate(p.paidAt)}</span>
                  <IconButton label="حذف" onClick={() => setToDelete(p)} className="hover:text-clay">
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
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

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removePayment(toDelete.id)}
        title="حذف الأداء"
        message={toDelete ? `هل تريد حذف أداء ${formatMonthPeriod(toDelete.period)} (${formatMoney(toDelete.amount)})؟` : ''}
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

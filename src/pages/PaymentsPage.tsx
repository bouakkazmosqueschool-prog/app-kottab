import { useMemo, useState } from 'react';
import { Wallet, Search, Check, CheckCircle2 } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { usePaymentsStore } from '../store/paymentsStore';
import { SectionHeader, Card, Button, Chip } from '../components/ui/Primitives';
import { Select, TextInput, NumberInput } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { currentMonthPeriod, formatMonthPeriod, monthPeriodsUpToNow } from '../lib/dates';
import { formatMoney } from '../lib/constants';

const PAGE_SIZE = 12;

export default function PaymentsPage() {
  const students = useStudentsStore((s) => s.students);
  const payments = usePaymentsStore((s) => s.payments);
  const setPayment = usePaymentsStore((s) => s.setPayment);

  const [period, setPeriod] = useState(currentMonthPeriod());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  // مسودّات المبالغ المُدخلة (قبل الحفظ)، مفتاحها معرّف التلميذ
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const periodOptions = useMemo(
    () => monthPeriodsUpToNow(Array.from(new Set(payments.map((p) => p.period)))),
    [payments],
  );

  /** أداء التلميذ لهذا الشهر إن وُجد */
  const paymentFor = useMemo(() => {
    const map = new Map<string, (typeof payments)[number]>();
    payments.filter((p) => p.period === period).forEach((p) => map.set(p.studentId, p));
    return map;
  }, [payments, period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeStudents
      .filter((s) => (q ? s.fullName.toLowerCase().includes(q) || s.level.includes(search.trim()) : true))
      .filter((s) => {
        const paid = paymentFor.has(s.id);
        return filter === 'all' ? true : filter === 'paid' ? paid : !paid;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [activeStudents, search, filter, paymentFor]);

  const { page, totalPages, setPage, pageItems, total } = usePagination(filtered, PAGE_SIZE);

  const unpaidCount = useMemo(
    () => activeStudents.filter((s) => !paymentFor.has(s.id)).length,
    [activeStudents, paymentFor],
  );

  async function handleSave(studentId: string) {
    const raw = drafts[studentId];
    const amount = Number(raw);
    if (raw === undefined || raw === '' || Number.isNaN(amount) || amount < 0) return;
    setSavingId(studentId);
    await setPayment(studentId, period, amount);
    setSavingId(null);
    setDrafts((d) => {
      const next = { ...d };
      delete next[studentId];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="تسجيل الأداءات"
        subtitle={`${formatMonthPeriod(period)} — ${unpaidCount} تلميذاً لم يؤدِّ بعد من أصل ${activeStudents.length}`}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-44">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {formatMonthPeriod(p)}
                </option>
              ))}
            </Select>
          </div>
          <Chip active={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>
            لم يؤدِّ
          </Chip>
          <Chip active={filter === 'paid'} onClick={() => setFilter('paid')}>
            أدّى
          </Chip>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            الكل
          </Chip>
        </div>
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-ink-soft absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <TextInput placeholder="البحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title="لا يوجد تلاميذ مطابقون" description="جرّب تغيير الشهر أو الفلتر." />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {pageItems.map((student) => {
            const existing = paymentFor.get(student.id);
            const draft = drafts[student.id];
            const draftValue = draft !== undefined ? draft : existing ? String(existing.amount) : '';
            const isSaving = savingId === student.id;
            return (
              <div key={student.id} className="p-4 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-gold-dark tabular-nums shrink-0">#{student.studentNumber}</span>
                <div className="min-w-[130px] flex-1">
                  <p className="text-sm font-bold text-ink truncate">{student.fullName}</p>
                  <p className="text-xs text-ink-soft">{student.level}</p>
                </div>
                {existing && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-teal shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {formatMoney(existing.amount)}
                  </span>
                )}
                <div className="w-28 shrink-0">
                  <NumberInput
                    value={draftValue}
                    min={0}
                    step="any"
                    placeholder="المبلغ"
                    onChange={(e) => setDrafts((d) => ({ ...d, [student.id]: e.target.value }))}
                  />
                </div>
                <Button
                  size="sm"
                  variant={existing ? 'secondary' : 'primary'}
                  icon={<Check className="w-3.5 h-3.5" />}
                  disabled={isSaving || draftValue === ''}
                  onClick={() => handleSave(student.id)}
                >
                  {isSaving ? 'جارٍ الحفظ...' : existing ? 'تعديل' : 'حفظ'}
                </Button>
              </div>
            );
          })}
          <div className="px-4">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
          </div>
        </Card>
      )}
    </div>
  );
}

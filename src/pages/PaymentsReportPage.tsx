import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, Download } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { usePaymentsStore } from '../store/paymentsStore';
import { useAuthStore } from '../store/authStore';
import { canRecordPayments } from '../data/teachers';
import { SectionHeader, Card, Button, Chip } from '../components/ui/Primitives';
import { MultiSelect } from '../components/ui/MultiSelect';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { currentMonthPeriod, formatMonthPeriod, formatShortDate, monthPeriodsUpToNow, todayISO } from '../lib/dates';
import { formatMoney } from '../lib/constants';
import { toCsv } from '../lib/csv';
import { downloadTextFile } from '../lib/dataManagement';

type PaidFilter = 'all' | 'paid' | 'unpaid';
const PAGE_SIZE = 20;

export default function PaymentsReportPage() {
  const students = useStudentsStore((s) => s.students);
  const payments = usePaymentsStore((s) => s.payments);
  const session = useAuthStore((s) => s.session);
  const canEnterPayments = canRecordPayments(session?.teacherName);
  const [searchParams] = useSearchParams();

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const periodOptions = useMemo(
    () => monthPeriodsUpToNow(Array.from(new Set(payments.map((p) => p.period)))),
    [payments],
  );

  // القيم الابتدائية قد تأتي من رابط التنبيه في لوحة التحكم (?period=&status=)
  const initialPeriod = searchParams.get('period');
  const initialStatus = searchParams.get('status') as PaidFilter | null;

  const [monthFilter, setMonthFilter] = useState<string[]>([initialPeriod ?? currentMonthPeriod()]);
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [paidFilter, setPaidFilter] = useState<PaidFilter>(
    initialStatus === 'paid' || initialStatus === 'unpaid' ? initialStatus : 'all',
  );

  // إذا تغيّر رابط التنبيه بعد التحميل الأول، نُحدّث الفلاتر
  useEffect(() => {
    if (initialPeriod) setMonthFilter([initialPeriod]);
    if (initialStatus === 'paid' || initialStatus === 'unpaid') setPaidFilter(initialStatus);
  }, [initialPeriod, initialStatus]);

  const studentOptions = useMemo(
    () => activeStudents.map((s) => ({ value: s.id, label: `#${s.studentNumber} ${s.fullName}` })),
    [activeStudents],
  );
  const monthOptions = useMemo(
    () => periodOptions.map((p) => ({ value: p, label: formatMonthPeriod(p) })),
    [periodOptions],
  );

  const paymentByKey = useMemo(() => {
    const map = new Map<string, (typeof payments)[number]>();
    payments.forEach((p) => map.set(`${p.studentId}|${p.period}`, p));
    return map;
  }, [payments]);

  // صفوف التقرير: لكل شهر مختار × كل تلميذ نشيط مرئي، حالة الأداء (مؤدّى/لم يؤدِّ)
  const rows = useMemo(() => {
    const months = monthFilter.length > 0 ? monthFilter : [currentMonthPeriod()];
    const studentList = studentFilter.length > 0 ? activeStudents.filter((s) => studentFilter.includes(s.id)) : activeStudents;
    const result: { key: string; studentId: string; studentName: string; studentNumber: number; period: string; amount: number | null; paidAt: string | null }[] = [];
    for (const period of months) {
      for (const s of studentList) {
        const payment = paymentByKey.get(`${s.id}|${period}`);
        const paid = payment != null;
        if (paidFilter === 'paid' && !paid) continue;
        if (paidFilter === 'unpaid' && paid) continue;
        result.push({
          key: `${s.id}|${period}`,
          studentId: s.id,
          studentName: s.fullName,
          studentNumber: s.studentNumber,
          period,
          amount: payment?.amount ?? null,
          paidAt: payment?.paidAt ?? null,
        });
      }
    }
    return result.sort((a, b) => (a.period === b.period ? a.studentName.localeCompare(b.studentName, 'ar') : a.period < b.period ? 1 : -1));
  }, [monthFilter, studentFilter, activeStudents, paymentByKey, paidFilter]);

  const totals = useMemo(() => {
    const paidRows = rows.filter((r) => r.amount !== null);
    const sum = paidRows.reduce((acc, r) => acc + (r.amount ?? 0), 0);
    return { paid: paidRows.length, unpaid: rows.length - paidRows.length, sum };
  }, [rows]);

  const { page, totalPages, setPage, pageItems, total } = usePagination(rows, PAGE_SIZE);

  function handleExportCsv() {
    const headers = ['الطالب', 'الشهر', 'المبلغ', 'تاريخ الأداء', 'الحالة'];
    const csvRows = rows.map((r) => [
      r.studentName,
      formatMonthPeriod(r.period),
      r.amount !== null ? String(r.amount) : '—',
      r.paidAt ? formatShortDate(r.paidAt) : '—',
      r.amount !== null ? 'مؤدّى' : 'لم يؤدِّ',
    ]);
    downloadTextFile(`تقرير-الأداءات-${todayISO()}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="print-header hidden print:block">
        <h1 className="font-display text-xl font-bold text-ink">تقرير الأداءات الشهرية</h1>
        <p className="text-sm text-ink-soft">تاريخ الإصدار: {formatShortDate(todayISO())}</p>
      </div>

      <SectionHeader
        title="تقرير الأداءات"
        subtitle={`${totals.paid} مؤدّى — ${totals.unpaid} لم يؤدِّ — المجموع: ${formatMoney(totals.sum)}`}
        action={
          <div className="flex gap-2 no-print">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
              تصدير CSV
            </Button>
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              طباعة
            </Button>
          </div>
        }
      />

      <div className="no-print flex flex-col gap-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <MultiSelect options={monthOptions} selected={monthFilter} onChange={setMonthFilter} placeholder="كل الأشهر" />
          <MultiSelect options={studentOptions} selected={studentFilter} onChange={setStudentFilter} placeholder="كل الطلاب" searchable />
        </div>
        <div className="flex gap-2">
          <Chip active={paidFilter === 'all'} onClick={() => setPaidFilter('all')}>
            الكل
          </Chip>
          <Chip active={paidFilter === 'paid'} onClick={() => setPaidFilter('paid')}>
            مؤدّى
          </Chip>
          <Chip active={paidFilter === 'unpaid'} onClick={() => setPaidFilter('unpaid')}>
            لم يؤدِّ
          </Chip>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="لا توجد نتائج" description="جرّب تغيير الفلاتر أعلاه." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft text-xs">
                <th className="text-start font-semibold px-4 py-3">الطالب</th>
                <th className="text-start font-semibold px-4 py-3">الشهر</th>
                <th className="text-start font-semibold px-4 py-3">المبلغ</th>
                <th className="text-start font-semibold px-4 py-3">تاريخ الأداء</th>
                <th className="text-start font-semibold px-4 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.key} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                    <span className="text-xs font-bold text-gold-dark tabular-nums me-1.5">#{r.studentNumber}</span>
                    {canEnterPayments ? (
                      <Link to={`/payments?student=${r.studentId}`} className="hover:text-bordeaux hover:underline transition-colors">
                        {r.studentName}
                      </Link>
                    ) : (
                      r.studentName
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatMonthPeriod(r.period)}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{r.amount !== null ? formatMoney(r.amount) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{r.paidAt ? formatShortDate(r.paidAt) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.amount !== null ? (
                      <span className="text-[11px] font-semibold bg-teal/12 text-teal px-2 py-0.5 rounded-full">مؤدّى</span>
                    ) : (
                      <span className="text-[11px] font-semibold bg-clay/12 text-clay px-2 py-0.5 rounded-full">لم يؤدِّ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 no-print">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
          </div>
        </Card>
      )}
    </div>
  );
}

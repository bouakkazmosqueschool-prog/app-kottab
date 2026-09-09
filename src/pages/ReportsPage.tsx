import { useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import { getAvailableHalqas } from '../data/teachers';
import type { GoalStatus } from '../types';
import { computeGoal, computeGoalStats, STATUS_LABELS } from '../lib/goalCalculations';
import { formatAmountWithUnit, GOAL_TYPE_LABELS, HALQA_LABELS } from '../lib/constants';
import { formatShortDate, todayISO } from '../lib/dates';
import { toCsv } from '../lib/csv';
import { downloadTextFile } from '../lib/dataManagement';
import { SectionHeader, Card, Button } from '../components/ui/Primitives';
import { DateInput } from '../components/ui/Field';
import { MultiSelect } from '../components/ui/MultiSelect';
import { GoalStatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 15;
export default function ReportsPage() {
  const students = useStudentsStore((s) => s.students);
  const goals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);
  const halqas = getAvailableHalqas(session?.teacherName);
  const visibleGoals = goals.filter((goal) => halqas.includes(goal.type));

  // اختيار متعدد: مصفوفة فارغة = «الكل» (لا فلترة)
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [halqaFilter, setHalqaFilter] = useState<string[]>(session?.halqa ? [session.halqa] : []);
  const [teacherFilter, setTeacherFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const teacherNames = useMemo(() => {
    const set = new Set<string>();
    visibleGoals.forEach((g) => g.teacherName && set.add(g.teacherName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [visibleGoals]);

  const halqaOptions = useMemo(() => halqas.map((h) => ({ value: h, label: HALQA_LABELS[h] })), [halqas]);
  const teacherOptions = useMemo(() => teacherNames.map((n) => ({ value: n, label: n })), [teacherNames]);
  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: `#${s.studentNumber} ${s.fullName}` })),
    [students],
  );
  const statusOptions = useMemo(
    () => (Object.keys(STATUS_LABELS) as GoalStatus[]).map((st) => ({ value: st, label: STATUS_LABELS[st] })),
    [],
  );

  const filtered = useMemo(() => {
    return visibleGoals
      .filter((g) => (studentFilter.length === 0 ? true : studentFilter.includes(g.studentId)))
      .filter((g) => (halqaFilter.length === 0 ? true : halqaFilter.includes(g.type)))
      .filter((g) => (teacherFilter.length === 0 ? true : g.teacherName != null && teacherFilter.includes(g.teacherName)))
      .filter((g) => (dateFrom ? g.startDate >= dateFrom : true))
      .filter((g) => (dateTo ? g.endDate <= dateTo : true))
      .filter((g) => (statusFilter.length === 0 ? true : statusFilter.includes(computeGoal(g).status)))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [visibleGoals, studentFilter, halqaFilter, teacherFilter, dateFrom, dateTo, statusFilter]);

  const stats = useMemo(() => computeGoalStats(filtered), [filtered]);
  const { page, totalPages, setPage, pageItems, total } = usePagination(filtered, PAGE_SIZE);

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    const headers = ['الطالب', 'الحلقة', 'الأستاذ', 'الفترة', 'المطلوب', 'المنجز', 'حالة الإنجاز', 'الملاحظات'];
    const rows = filtered.map((g) => {
      const { status } = computeGoal(g);
      return [
        studentsById.get(g.studentId)?.fullName ?? 'طالب محذوف',
        GOAL_TYPE_LABELS[g.type],
        g.teacherName ?? '—',
        g.periodLabel,
        formatAmountWithUnit(g.targetAmount, g.unit),
        g.achievedAmount !== null ? formatAmountWithUnit(g.achievedAmount, g.unit) : '—',
        STATUS_LABELS[status],
        g.notes ?? '',
      ];
    });
    downloadTextFile(`تقرير-الإنجاز-${todayISO()}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="print-header hidden print:block">
        <h1 className="font-display text-xl font-bold text-ink">تقرير الإنجاز</h1>
        <p className="text-sm text-ink-soft">تاريخ الإصدار: {formatShortDate(todayISO())}</p>
      </div>

      <SectionHeader
        title="التقارير"
        subtitle={`${total} نتيجة — معدل الإنجاز: ${stats.averagePercentage ?? '—'}%`}
        action={
          <div className="flex gap-2 no-print">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
              تصدير CSV
            </Button>
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              طباعة
            </Button>
          </div>
        }
      />

      <div className="no-print grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MultiSelect options={halqaOptions} selected={halqaFilter} onChange={setHalqaFilter} placeholder="كل الحلقات" />
        <MultiSelect options={teacherOptions} selected={teacherFilter} onChange={setTeacherFilter} placeholder="كل الأساتذة" />
        <MultiSelect options={studentOptions} selected={studentFilter} onChange={setStudentFilter} placeholder="كل الطلاب" searchable />
        <MultiSelect options={statusOptions} selected={statusFilter} onChange={setStatusFilter} placeholder="كل الحالات" />
        <div className="grid grid-cols-2 gap-2">
          <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="من تاريخ" />
          <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="إلى تاريخ" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title="لا توجد نتائج" description="جرّب تغيير الفلاتر أعلاه." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft text-xs">
                <th className="text-start font-semibold px-4 py-3">الطالب</th>
                <th className="text-start font-semibold px-4 py-3">الحلقة</th>
                <th className="text-start font-semibold px-4 py-3">الأستاذ</th>
                <th className="text-start font-semibold px-4 py-3">الفترة</th>
                <th className="text-start font-semibold px-4 py-3">المطلوب</th>
                <th className="text-start font-semibold px-4 py-3">المنجز</th>
                <th className="text-start font-semibold px-4 py-3">حالة الإنجاز</th>
                <th className="text-start font-semibold px-4 py-3">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => {
                const { status } = computeGoal(g);
                return (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">{studentsById.get(g.studentId)?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{GOAL_TYPE_LABELS[g.type]}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{g.teacherName ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{g.periodLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatAmountWithUnit(g.targetAmount, g.unit)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {g.achievedAmount !== null ? formatAmountWithUnit(g.achievedAmount, g.unit) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <GoalStatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft max-w-[220px] truncate">{g.notes ?? ''}</td>
                  </tr>
                );
              })}
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

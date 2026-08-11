import { useMemo, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import type { GoalStatus, Halqa, PeriodType } from '../types';
import { computeGoal, computeGoalStats, STATUS_LABELS } from '../lib/goalCalculations';
import { formatAmountWithUnit, GOAL_TYPE_LABELS, HALQA_LABELS, PERIOD_TYPE_LABELS } from '../lib/constants';
import { formatShortDate, todayISO } from '../lib/dates';
import { toCsv } from '../lib/csv';
import { downloadTextFile } from '../lib/dataManagement';
import { SectionHeader, Card, Button } from '../components/ui/Primitives';
import { Select, DateInput } from '../components/ui/Field';
import { GoalStatusBadge, EvaluationBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';

const PAGE_SIZE = 15;
const HALQAS: Halqa[] = ['hifz', 'murajaa', 'alwah'];

export default function ReportsPage() {
  const students = useStudentsStore((s) => s.students);
  const goals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);

  const [studentFilter, setStudentFilter] = useState('all');
  const [halqaFilter, setHalqaFilter] = useState<'all' | Halqa>(session?.halqa ?? 'all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');
  const [periodTypeFilter, setPeriodTypeFilter] = useState<'all' | PeriodType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const teacherNames = useMemo(() => {
    const set = new Set<string>();
    goals.forEach((g) => g.teacherName && set.add(g.teacherName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [goals]);

  const filtered = useMemo(() => {
    return goals
      .filter((g) => (studentFilter === 'all' ? true : g.studentId === studentFilter))
      .filter((g) => (halqaFilter === 'all' ? true : g.type === halqaFilter))
      .filter((g) => (teacherFilter === 'all' ? true : g.teacherName === teacherFilter))
      .filter((g) => (periodTypeFilter === 'all' ? true : g.periodType === periodTypeFilter))
      .filter((g) => (dateFrom ? g.startDate >= dateFrom : true))
      .filter((g) => (dateTo ? g.endDate <= dateTo : true))
      .filter((g) => (statusFilter === 'all' ? true : computeGoal(g).status === statusFilter))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [goals, studentFilter, halqaFilter, teacherFilter, periodTypeFilter, dateFrom, dateTo, statusFilter]);

  const stats = useMemo(() => computeGoalStats(filtered), [filtered]);
  const { page, totalPages, setPage, pageItems, total } = usePagination(filtered, PAGE_SIZE);

  function handlePrint() {
    window.print();
  }

  function handleExportCsv() {
    const headers = ['الطالب', 'الحلقة', 'الأستاذ', 'الفترة', 'المطلوب', 'المنجز', 'حالة الإنجاز', 'التقييم', 'الملاحظات'];
    const rows = filtered.map((g) => {
      const { status, evaluation } = computeGoal(g);
      return [
        studentsById.get(g.studentId)?.fullName ?? 'طالب محذوف',
        GOAL_TYPE_LABELS[g.type],
        g.teacherName ?? '—',
        g.periodLabel,
        formatAmountWithUnit(g.targetAmount, g.unit),
        g.achievedAmount !== null ? formatAmountWithUnit(g.achievedAmount, g.unit) : '—',
        STATUS_LABELS[status],
        evaluation ?? '—',
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
        <Select value={halqaFilter} onChange={(e) => setHalqaFilter(e.target.value as 'all' | Halqa)}>
          <option value="all">كل الحلقات</option>
          {HALQAS.map((h) => (
            <option key={h} value={h}>
              {HALQA_LABELS[h]}
            </option>
          ))}
        </Select>
        <Select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}>
          <option value="all">كل الأساتذة</option>
          {teacherNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
          <option value="all">كل الطلاب</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </Select>
        <Select value={periodTypeFilter} onChange={(e) => setPeriodTypeFilter(e.target.value as 'all' | PeriodType)}>
          <option value="all">كل أنواع الفترات</option>
          {(['week', 'month', 'custom'] as PeriodType[]).map((pt) => (
            <option key={pt} value={pt}>
              {PERIOD_TYPE_LABELS[pt]}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | GoalStatus)}>
          <option value="all">كل الحالات</option>
          {(Object.keys(STATUS_LABELS) as GoalStatus[]).map((st) => (
            <option key={st} value={st}>
              {STATUS_LABELS[st]}
            </option>
          ))}
        </Select>
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
                <th className="text-start font-semibold px-4 py-3">التقييم</th>
                <th className="text-start font-semibold px-4 py-3">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => {
                const { status, evaluation } = computeGoal(g);
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <EvaluationBadge grade={evaluation} />
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

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarCheck, Printer } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { canSeeAcademics } from '../data/teachers';
import { attendsOn, FRIDAY } from '../lib/attendance';
import {
  parseISODate,
  todayISO,
  formatLongDate,
  formatShortDate,
  datesOfMonth,
  currentMonthPeriod,
  monthPeriodRange,
  addMonthsToPeriod,
  WEEKDAYS_AR,
  MONTHS_MA,
} from '../lib/dates';
import { SectionHeader, Card, Chip, Button } from '../components/ui/Primitives';
import { DateInput } from '../components/ui/Field';
import { SearchSelect } from '../components/ui/SearchSelect';
import { MultiSelect } from '../components/ui/MultiSelect';
import { EmptyState } from '../components/ui/EmptyState';

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS_MA[(m ?? 1) - 1]} (${y})`;
}

export default function AttendancePage() {
  const students = useStudentsStore((s) => s.students);
  const records = useAttendanceStore((s) => s.records);
  const setStatus = useAttendanceStore((s) => s.setStatus);
  const clear = useAttendanceStore((s) => s.clear);
  const session = useAuthStore((s) => s.session);
  // الأستاذ والمدير العام يسجّلون؛ المشرف المالي يرى فقط
  const canEdit = canSeeAcademics(session?.teacherName);

  const [view, setView] = useState<'entry' | 'report'>('entry');

  const activeStudents = useMemo(
    () => students.filter((s) => s.active).sort((a, b) => a.studentNumber - b.studentNumber),
    [students],
  );
  const studentFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'كل الطلاب' },
      ...activeStudents.map((s) => ({ value: s.id, label: `#${s.studentNumber} ${s.fullName}` })),
    ],
    [activeStudents],
  );

  // ============ وضع التسجيل اليومي ============
  const [date, setDate] = useState(todayISO());
  const [studentFilter, setStudentFilter] = useState('all');
  const weekday = parseISODate(date).getDay();
  const isFriday = weekday === FRIDAY;

  const dayStudents = useMemo(() => {
    if (isFriday) return [];
    return activeStudents
      .filter((s) => attendsOn(s, weekday))
      .filter((s) => (studentFilter === 'all' ? true : s.id === studentFilter));
  }, [activeStudents, weekday, isFriday, studentFilter]);

  const statusByStudent = useMemo(() => {
    const map = new Map<string, 'present' | 'absent'>();
    records.filter((r) => r.date === date).forEach((r) => map.set(r.studentId, r.status));
    return map;
  }, [records, date]);

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const s of dayStudents) {
      const st = statusByStudent.get(s.id);
      if (st === 'present') present += 1;
      else if (st === 'absent') absent += 1;
      else unmarked += 1;
    }
    return { present, absent, unmarked };
  }, [dayStudents, statusByStudent]);

  function mark(studentId: string, status: 'present' | 'absent') {
    if (!canEdit) return;
    if (statusByStudent.get(studentId) === status) clear(studentId, date);
    else setStatus(studentId, date, status);
  }

  // ============ وضع التقرير الشهري ============
  const [reportMonths, setReportMonths] = useState<string[]>([currentMonthPeriod()]);
  const [reportStudent, setReportStudent] = useState('all');

  const reportMonthOptions = useMemo(() => {
    const current = currentMonthPeriod();
    const windowMonths = monthPeriodRange(addMonthsToPeriod(current, -11), current);
    const all = new Set<string>([...windowMonths, ...records.map((r) => r.date.slice(0, 7))]);
    return Array.from(all)
      .sort()
      .map((p) => ({ value: p, label: monthLabel(p) }));
  }, [records]);

  const statusMap = useMemo(() => {
    const map = new Map<string, 'present' | 'absent'>();
    records.forEach((r) => map.set(`${r.studentId}|${r.date}`, r.status));
    return map;
  }, [records]);

  const report = useMemo(() => {
    const months = reportMonths.length > 0 ? [...reportMonths].sort() : [currentMonthPeriod()];
    const list = reportStudent === 'all' ? activeStudents : activeStudents.filter((s) => s.id === reportStudent);
    const today = todayISO();
    return list.map((s) => {
      let present = 0;
      let absent = 0;
      let unmarked = 0;
      const detail: { date: string; weekday: number; status: 'present' | 'absent' | null }[] = [];
      for (const period of months) {
        for (const d of datesOfMonth(period)) {
          if (d > today || d < s.joinDate) continue;
          const wd = parseISODate(d).getDay();
          if (!attendsOn(s, wd)) continue;
          const st = statusMap.get(`${s.id}|${d}`) ?? null;
          if (st === 'present') present += 1;
          else if (st === 'absent') absent += 1;
          else unmarked += 1;
          detail.push({ date: d, weekday: wd, status: st });
        }
      }
      const total = present + absent + unmarked;
      const rate = total > 0 ? Math.round((present / total) * 100) : null;
      return { student: s, present, absent, unmarked, total, rate, detail };
    });
  }, [reportMonths, reportStudent, activeStudents, statusMap]);

  const singleDetail = reportStudent !== 'all' && report.length === 1 ? report[0] : null;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="الحضور والغياب"
        subtitle={view === 'entry' ? formatLongDate(date) : 'تقرير الحضور حسب الشهر'}
        action={
          view === 'report' ? (
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()} className="no-print">
              طباعة
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 no-print">
        <Chip active={view === 'entry'} onClick={() => setView('entry')}>
          التسجيل
        </Chip>
        <Chip active={view === 'report'} onClick={() => setView('report')}>
          التقرير
        </Chip>
      </div>

      {view === 'entry' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-48">
              <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="w-full sm:w-64">
              <SearchSelect options={studentFilterOptions} value={studentFilter} onChange={setStudentFilter} placeholder="كل الطلاب" />
            </div>
          </div>

          {isFriday ? (
            <Card>
              <EmptyState icon={CalendarCheck} title="الجمعة عطلة" description="لا حضور يوم الجمعة." />
            </Card>
          ) : dayStudents.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarCheck} title="لا يوجد تلاميذ لهذا اليوم" description="لا أحد مبرمَج للحضور في هذا اليوم." />
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold bg-teal/12 text-teal px-2.5 py-1 rounded-full">حاضر {summary.present}</span>
                <span className="text-xs font-semibold bg-clay/12 text-clay px-2.5 py-1 rounded-full">غائب {summary.absent}</span>
                <span className="text-xs font-semibold bg-ink/8 text-ink-soft px-2.5 py-1 rounded-full">غير مسجَّل {summary.unmarked}</span>
              </div>

              <Card className="divide-y divide-line">
                {dayStudents.map((s) => {
                  const st = statusByStudent.get(s.id);
                  return (
                    <div key={s.id} className="p-3 flex items-center gap-3">
                      <span className="text-xs font-bold text-gold-dark tabular-nums shrink-0">#{s.studentNumber}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{s.fullName}</p>
                        <p className="text-xs text-ink-soft">{s.level}</p>
                      </div>
                      {canEdit ? (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => mark(s.id, 'present')}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                              st === 'present' ? 'bg-teal text-cream' : 'bg-teal/10 text-teal hover:bg-teal/20',
                            )}
                          >
                            حاضر
                          </button>
                          <button
                            type="button"
                            onClick={() => mark(s.id, 'absent')}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                              st === 'absent' ? 'bg-clay text-cream' : 'bg-clay/10 text-clay hover:bg-clay/20',
                            )}
                          >
                            غائب
                          </button>
                        </div>
                      ) : (
                        <span
                          className={clsx(
                            'text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0',
                            st === 'present' ? 'bg-teal/12 text-teal' : st === 'absent' ? 'bg-clay/12 text-clay' : 'bg-ink/8 text-ink-soft',
                          )}
                        >
                          {st === 'present' ? 'حاضر' : st === 'absent' ? 'غائب' : 'غير مسجَّل'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </>
      ) : (
        <>
          <div className="print-header hidden print:block mb-2">
            <h1 className="font-display text-xl font-bold text-ink">تقرير الحضور والغياب</h1>
            <p className="text-sm text-ink-soft">
              {reportMonths.map(monthLabel).join('، ')} — تاريخ الإصدار: {formatShortDate(todayISO())}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 no-print">
            <MultiSelect options={reportMonthOptions} selected={reportMonths} onChange={setReportMonths} placeholder="اختر الأشهر" />
            <SearchSelect options={studentFilterOptions} value={reportStudent} onChange={setReportStudent} placeholder="كل الطلاب" />
          </div>

          {report.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarCheck} title="لا توجد نتائج" description="جرّب تغيير الفلاتر." />
            </Card>
          ) : singleDetail ? (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 flex flex-wrap items-center gap-3 border-b border-line">
                <span className="text-xs font-bold text-gold-dark tabular-nums">#{singleDetail.student.studentNumber}</span>
                <p className="font-display font-bold text-ink">{singleDetail.student.fullName}</p>
                <div className="flex flex-wrap gap-2 ms-auto">
                  <span className="text-xs font-semibold bg-teal/12 text-teal px-2.5 py-1 rounded-full">حاضر {singleDetail.present}</span>
                  <span className="text-xs font-semibold bg-clay/12 text-clay px-2.5 py-1 rounded-full">غائب {singleDetail.absent}</span>
                  <span className="text-xs font-semibold bg-ink/8 text-ink-soft px-2.5 py-1 rounded-full">غير مسجَّل {singleDetail.unmarked}</span>
                  {singleDetail.rate !== null && (
                    <span className="text-xs font-bold bg-bordeaux/8 text-bordeaux px-2.5 py-1 rounded-full">نسبة الحضور {singleDetail.rate}%</span>
                  )}
                </div>
              </div>
              {singleDetail.detail.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="لا توجد أيام في هذه الفترة" />
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {singleDetail.detail.map((d) => (
                    <div key={d.date} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-ink-soft w-8 shrink-0">{WEEKDAYS_AR[d.weekday]}</span>
                      <span className="text-ink">{formatShortDate(d.date)}</span>
                      <span
                        className={clsx(
                          'text-[11px] font-semibold px-2.5 py-0.5 rounded-full ms-auto',
                          d.status === 'present' ? 'bg-teal/12 text-teal' : d.status === 'absent' ? 'bg-clay/12 text-clay' : 'bg-ink/8 text-ink-soft',
                        )}
                      >
                        {d.status === 'present' ? 'حاضر' : d.status === 'absent' ? 'غائب' : 'غير مسجَّل'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-soft text-xs">
                    <th className="text-start font-semibold px-4 py-3">الطالب</th>
                    <th className="text-start font-semibold px-4 py-3">أيام</th>
                    <th className="text-start font-semibold px-4 py-3">حاضر</th>
                    <th className="text-start font-semibold px-4 py-3">غائب</th>
                    <th className="text-start font-semibold px-4 py-3">غير مسجَّل</th>
                    <th className="text-start font-semibold px-4 py-3">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r) => (
                    <tr key={r.student.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                        <span className="text-xs font-bold text-gold-dark tabular-nums me-1.5">#{r.student.studentNumber}</span>
                        {r.student.fullName}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-soft">{r.total}</td>
                      <td className="px-4 py-3 tabular-nums text-teal font-semibold">{r.present}</td>
                      <td className="px-4 py-3 tabular-nums text-clay font-semibold">{r.absent}</td>
                      <td className="px-4 py-3 tabular-nums text-ink-soft">{r.unmarked}</td>
                      <td className="px-4 py-3 tabular-nums font-bold text-ink">{r.rate !== null ? `${r.rate}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

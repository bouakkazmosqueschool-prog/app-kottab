import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarCheck } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { canSeeAcademics } from '../data/teachers';
import { attendsOn, FRIDAY } from '../lib/attendance';
import { parseISODate, todayISO, formatLongDate } from '../lib/dates';
import { SectionHeader, Card } from '../components/ui/Primitives';
import { DateInput } from '../components/ui/Field';
import { SearchSelect } from '../components/ui/SearchSelect';
import { EmptyState } from '../components/ui/EmptyState';

export default function AttendancePage() {
  const students = useStudentsStore((s) => s.students);
  const records = useAttendanceStore((s) => s.records);
  const setStatus = useAttendanceStore((s) => s.setStatus);
  const clear = useAttendanceStore((s) => s.clear);
  const session = useAuthStore((s) => s.session);
  // الأستاذ والمدير العام يسجّلون؛ المشرف المالي يرى فقط
  const canEdit = canSeeAcademics(session?.teacherName);

  const [date, setDate] = useState(todayISO());
  const [studentFilter, setStudentFilter] = useState('all');

  const weekday = parseISODate(date).getDay();
  const isFriday = weekday === FRIDAY;

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

  // التلاميذ المبرمَجون للحضور في هذا اليوم، حسب الفلتر
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
    // إعادة الضغط على نفس الحالة يمسحها (يرجعها غير مسجَّلة)
    if (statusByStudent.get(studentId) === status) clear(studentId, date);
    else setStatus(studentId, date, status);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="الحضور والغياب" subtitle={formatLongDate(date)} />

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
                        st === 'present'
                          ? 'bg-teal/12 text-teal'
                          : st === 'absent'
                            ? 'bg-clay/12 text-clay'
                            : 'bg-ink/8 text-ink-soft',
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
    </div>
  );
}

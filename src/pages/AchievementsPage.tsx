import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import type { Goal } from '../types';
import { computeGoal } from '../lib/goalCalculations';
import { formatAmountWithUnit, HALQA_LABELS } from '../lib/constants';
import { SectionHeader, Card, Chip, Button } from '../components/ui/Primitives';
import { MultiSelect } from '../components/ui/MultiSelect';
import { useStarredScope } from '../hooks/useStarredScope';
import { monthBucketKey, formatMonthPeriod } from '../lib/dates';
import { GoalStatusBadge, GoalTypeBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { AchievementFormModal } from '../components/goals/AchievementFormModal';

export default function AchievementsPage() {
  const students = useStudentsStore((s) => s.students);
  const allGoals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  // فلاتر متعددة: قائمة فارغة = الكل
  const [studentFilter, setStudentFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const { onlyStarred, starredIds } = useStarredScope();
  const scopedStudents = useMemo(() => (onlyStarred ? students.filter((s) => s.starred) : students), [students, onlyStarred]);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const studentFilterOptions = useMemo(
    () =>
      [...scopedStudents]
        .sort((a, b) => a.studentNumber - b.studentNumber)
        .map((s) => ({ value: s.id, label: `#${s.studentNumber} ${s.fullName}` })),
    [scopedStudents],
  );

  const halqaGoals = useMemo(
    () => allGoals.filter((g) => g.type === halqa && (!onlyStarred || starredIds.has(g.studentId))),
    [allGoals, halqa, onlyStarred, starredIds],
  );
  const monthFilterOptions = useMemo(() => {
    const months = Array.from(new Set(halqaGoals.map((g) => monthBucketKey(g.startDate)))).sort();
    return months.map((m) => ({ value: m, label: formatMonthPeriod(m) }));
  }, [halqaGoals]);

  const filtered = useMemo(() => {
    return halqaGoals
      .filter((g) => (scope === 'pending' ? g.achievedAmount === null : true))
      .filter((g) => (studentFilter.length > 0 ? studentFilter.includes(g.studentId) : true))
      .filter((g) => (monthFilter.length > 0 ? monthFilter.includes(monthBucketKey(g.startDate)) : true))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [halqaGoals, scope, studentFilter, monthFilter]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="تسجيل الإنجاز" subtitle={`${HALQA_LABELS[halqa]} — سجّل ما أنجزه كل طالب في نهاية الفترة`} />

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Chip active={scope === 'pending'} onClick={() => setScope('pending')}>
            بانتظار التسجيل
          </Chip>
          <Chip active={scope === 'all'} onClick={() => setScope('all')}>
            الكل
          </Chip>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <MultiSelect options={studentFilterOptions} selected={studentFilter} onChange={setStudentFilter} placeholder="كل الطلاب" searchable />
          <MultiSelect options={monthFilterOptions} selected={monthFilter} onChange={setMonthFilter} placeholder="كل الأشهر" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title={scope === 'pending' ? 'لا توجد أهداف بانتظار التسجيل' : 'لا توجد أهداف'}
            description={scope === 'pending' ? 'كل الأهداف مسجَّلة! تحقق من قسم "الكل" لمراجعتها.' : undefined}
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {filtered.map((g) => {
            const student = studentsById.get(g.studentId);
            const { status, percentage } = computeGoal(g);
            return (
              <div key={g.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-[140px]">
                  <p className="text-sm font-bold text-ink">{student?.fullName ?? 'طالب محذوف'}</p>
                  <p className="text-xs text-ink-soft">{g.periodLabel}</p>
                </div>
                <GoalTypeBadge type={g.type} />
                <span className="text-sm text-ink-soft">المطلوب: {formatAmountWithUnit(g.targetAmount, g.unit)}</span>
                {g.achievedAmount !== null && (
                  <>
                    <GoalStatusBadge status={status} />
                    {percentage !== null && <span className="text-sm font-bold text-ink tabular-nums">{percentage}%</span>}
                  </>
                )}
                <Button size="sm" variant={g.achievedAmount === null ? 'primary' : 'secondary'} className="ms-auto" onClick={() => setSelectedGoal(g)}>
                  {g.achievedAmount === null ? 'تسجيل الإنجاز' : 'تعديل'}
                </Button>
              </div>
            );
          })}
        </Card>
      )}

      <AchievementFormModal goal={selectedGoal} studentName={selectedGoal ? studentsById.get(selectedGoal.studentId)?.fullName : undefined} onClose={() => setSelectedGoal(null)} />
    </div>
  );
}

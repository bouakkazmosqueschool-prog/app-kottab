import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import type { Goal } from '../types';
import { computeGoal } from '../lib/goalCalculations';
import { formatAmountWithUnit, HALQA_LABELS } from '../lib/constants';
import { SectionHeader, Card, Chip, Button } from '../components/ui/Primitives';
import { Select } from '../components/ui/Field';
import { GoalStatusBadge, GoalTypeBadge, EvaluationBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { AchievementFormModal } from '../components/goals/AchievementFormModal';

export default function AchievementsPage() {
  const students = useStudentsStore((s) => s.students);
  const allGoals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';
  const [scope, setScope] = useState<'pending' | 'all'>('pending');
  const [studentFilter, setStudentFilter] = useState('all');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filtered = useMemo(() => {
    return allGoals
      .filter((g) => g.type === halqa)
      .filter((g) => (scope === 'pending' ? g.achievedAmount === null : true))
      .filter((g) => (studentFilter === 'all' ? true : g.studentId === studentFilter))
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [allGoals, halqa, scope, studentFilter]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="تسجيل الإنجاز" subtitle={`${HALQA_LABELS[halqa]} — سجّل ما أنجزه كل تلميذ في نهاية الفترة`} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex gap-2">
          <Chip active={scope === 'pending'} onClick={() => setScope('pending')}>
            بانتظار التسجيل
          </Chip>
          <Chip active={scope === 'all'} onClick={() => setScope('all')}>
            الكل
          </Chip>
        </div>
        <div className="w-full sm:w-56">
          <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
            <option value="all">كل التلاميذ</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>
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
            const { status, percentage, evaluation } = computeGoal(g);
            return (
              <div key={g.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-[140px]">
                  <p className="text-sm font-bold text-ink">{student?.fullName ?? 'تلميذ محذوف'}</p>
                  <p className="text-xs text-ink-soft">{g.periodLabel}</p>
                </div>
                <GoalTypeBadge type={g.type} />
                <span className="text-sm text-ink-soft">المطلوب: {formatAmountWithUnit(g.targetAmount, g.unit)}</span>
                {g.achievedAmount !== null && (
                  <>
                    <GoalStatusBadge status={status} />
                    <EvaluationBadge grade={evaluation} />
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

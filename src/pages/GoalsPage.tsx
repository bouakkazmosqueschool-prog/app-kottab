import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import type { Goal, PeriodType } from '../types';
import { computeGoal } from '../lib/goalCalculations';
import { formatAmountWithUnit, GOAL_TYPE_LABELS, HALQA_LABELS, PERIOD_TYPE_LABELS } from '../lib/constants';
import { SectionHeader, Card, Chip, Button, IconButton } from '../components/ui/Primitives';
import { Select } from '../components/ui/Field';
import { GoalStatusBadge, GoalTypeBadge, EvaluationBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { GoalFormModal } from '../components/goals/GoalFormModal';
import { Pagination } from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';

interface GoalGroup {
  key: string;
  studentId: string;
  studentName: string;
  periodLabel: string;
  periodType: PeriodType;
  startDate: string;
  goals: Goal[];
}

export default function GoalsPage() {
  const students = useStudentsStore((s) => s.students);
  const allGoals = useGoalsStore((s) => s.goals);
  const removeGoal = useGoalsStore((s) => s.removeGoal);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';

  const [studentFilter, setStudentFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | PeriodType>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Goal | null>(null);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const goals = useMemo(() => allGoals.filter((g) => g.type === halqa), [allGoals, halqa]);

  const groups = useMemo(() => {
    const map = new Map<string, GoalGroup>();
    for (const g of goals) {
      if (studentFilter !== 'all' && g.studentId !== studentFilter) continue;
      if (periodFilter !== 'all' && g.periodType !== periodFilter) continue;
      const key = `${g.studentId}|${g.startDate}|${g.endDate}`;
      const student = studentsById.get(g.studentId);
      if (!map.has(key)) {
        map.set(key, {
          key,
          studentId: g.studentId,
          studentName: student?.fullName ?? 'تلميذ محذوف',
          periodLabel: g.periodLabel,
          periodType: g.periodType,
          startDate: g.startDate,
          goals: [],
        });
      }
      map.get(key)!.goals.push(g);
    }
    return Array.from(map.values()).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [goals, studentFilter, periodFilter, studentsById]);

  const { page, totalPages, setPage, pageItems, total } = usePagination(groups, 8);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="الأهداف"
        subtitle={`${HALQA_LABELS[halqa]} — الأهداف المطلوبة من كل تلميذ حسب الفترة`}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
            إضافة هدف {GOAL_TYPE_LABELS[halqa]}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
        <div className="flex gap-2">
          <Chip active={periodFilter === 'all'} onClick={() => setPeriodFilter('all')}>
            الكل
          </Chip>
          {(['week', 'month', 'custom'] as PeriodType[]).map((pt) => (
            <Chip key={pt} active={periodFilter === pt} onClick={() => setPeriodFilter(pt)}>
              {PERIOD_TYPE_LABELS[pt]}
            </Chip>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد أهداف"
            description="لم يتم العثور على أهداف مطابقة للفلاتر الحالية."
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
                إضافة هدف {GOAL_TYPE_LABELS[halqa]}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {pageItems.map((group) => (
            <Card key={group.key} className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div>
                  <Link to={`/students/${group.studentId}`} className="font-display font-bold text-ink hover:text-bordeaux transition-colors">
                    {group.studentName}
                  </Link>
                  <p className="text-xs text-ink-soft mt-0.5">{group.periodLabel}</p>
                </div>
                <span className="text-[11px] font-semibold bg-bordeaux/8 text-bordeaux-dark px-2.5 py-1 rounded-full">
                  {PERIOD_TYPE_LABELS[group.periodType]}
                </span>
              </div>
              <div className="flex flex-col divide-y divide-line">
                {group.goals.map((g) => {
                  const { status, percentage, evaluation } = computeGoal(g);
                  return (
                    <div key={g.id} className="py-2.5 flex flex-wrap items-center gap-3">
                      <GoalTypeBadge type={g.type} />
                      <span className="text-sm text-ink-soft">
                        المطلوب: <b className="text-ink font-semibold">{formatAmountWithUnit(g.targetAmount, g.unit)}</b>
                        {g.achievedAmount !== null && (
                          <>
                            {' '}
                            — المنجز: <b className="text-ink font-semibold">{formatAmountWithUnit(g.achievedAmount, g.unit)}</b>
                          </>
                        )}
                        {percentage !== null && ` (${percentage}%)`}
                      </span>
                      <GoalStatusBadge status={status} />
                      <EvaluationBadge grade={evaluation} />
                      <IconButton label="حذف" onClick={() => setToDelete(g)} className="ms-auto hover:text-clay">
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
        </div>
      )}

      <GoalFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removeGoal(toDelete.id)}
        title="حذف الهدف"
        message="هل أنت متأكد من حذف هذا الهدف؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

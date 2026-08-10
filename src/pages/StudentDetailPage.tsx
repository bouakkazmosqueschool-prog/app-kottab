import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil, Phone, Calendar, BookOpen } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useMemorizationStore } from '../store/memorizationStore';
import { getSurahById } from '../data/surahs';
import { computeGoal, computeGoalStats } from '../lib/goalCalculations';
import { formatShortDate } from '../lib/dates';
import { formatAmountWithUnit } from '../lib/constants';
import { Card, Button } from '../components/ui/Primitives';
import { RadialProgress } from '../components/ui/StatCard';
import { GoalStatusBadge, GoalTypeBadge, EvaluationBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { StudentFormModal } from '../components/students/StudentFormModal';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const student = useStudentsStore((s) => s.students.find((st) => st.id === id));
  const allGoals = useGoalsStore((s) => s.goals);
  const allRecords = useMemorizationStore((s) => s.records);
  const goals = useMemo(() => allGoals.filter((g) => g.studentId === id), [allGoals, id]);
  const records = useMemo(() => allRecords.filter((r) => r.studentId === id), [allRecords, id]);
  const [editOpen, setEditOpen] = useState(false);

  const stats = useMemo(() => computeGoalStats(goals), [goals]);

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [goals],
  );

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [records],
  );

  if (!student) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => navigate('/students')} className="flex items-center gap-1.5 text-sm text-bordeaux font-semibold w-fit">
          <ArrowRight className="w-4 h-4" /> العودة إلى التلاميذ
        </button>
        <Card>
          <EmptyState title="التلميذ غير موجود" description="ربما تم حذف هذا التلميذ." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/students')} className="flex items-center gap-1.5 text-sm text-bordeaux font-semibold w-fit hover:underline">
        <ArrowRight className="w-4 h-4" /> العودة إلى التلاميذ
      </button>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <RadialProgress percentage={stats.averagePercentage ?? 0} size={140} label="معدل الإنجاز" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">{student.fullName}</h1>
                <p className="text-sm text-ink-soft mt-1">{student.level}</p>
              </div>
              <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditOpen(true)}>
                تعديل
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-ink-soft">
              {student.guardianPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" /> {student.guardianPhone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> منذ {formatShortDate(student.joinDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> {records.length} سجلّ حفظ
              </span>
              {!student.active && (
                <span className="text-[11px] font-semibold bg-ink/8 text-ink-soft px-2 py-0.5 rounded-full">غير نشيط</span>
              )}
            </div>
            {student.notes && <p className="text-sm text-ink-soft mt-3 bg-cream rounded-lg p-3">{student.notes}</p>}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">الأهداف ({goals.length})</h3>
        {sortedGoals.length === 0 ? (
          <EmptyState title="لا توجد أهداف بعد" />
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {sortedGoals.map((g) => {
              const { status, percentage, evaluation } = computeGoal(g);
              return (
                <div key={g.id} className="py-3 flex flex-wrap items-center gap-3">
                  <GoalTypeBadge type={g.type} />
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-sm font-medium text-ink">{g.periodLabel}</p>
                    <p className="text-xs text-ink-soft">
                      المطلوب: {formatAmountWithUnit(g.targetAmount, g.unit)}
                      {g.achievedAmount !== null && ` — المنجز: ${formatAmountWithUnit(g.achievedAmount, g.unit)}`}
                      {percentage !== null && ` (${percentage}%)`}
                    </p>
                  </div>
                  <GoalStatusBadge status={status} />
                  <EvaluationBadge grade={evaluation} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">سجلّ الحفظ</h3>
        {sortedRecords.length === 0 ? (
          <EmptyState title="لا يوجد سجلّ حفظ بعد" />
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {sortedRecords.map((r) => {
              const surah = getSurahById(r.surahId);
              return (
                <div key={r.id} className="py-3 flex flex-wrap items-center gap-3">
                  <span className="font-display font-bold text-ink text-sm">{surah?.name}</span>
                  <span className="text-xs text-ink-soft">
                    الآيات {r.startVerse}–{r.endVerse}
                  </span>
                  <span className="text-xs text-ink-soft ms-auto">{formatShortDate(r.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} />
    </div>
  );
}

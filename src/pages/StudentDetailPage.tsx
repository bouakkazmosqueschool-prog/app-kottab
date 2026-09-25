import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil, Phone, Calendar, BookOpen, FileText } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useMemorizationStore } from '../store/memorizationStore';
import { useAuthStore } from '../store/authStore';
import { useTeacherProfilesStore } from '../store/teacherProfilesStore';
import { isSuperTeacher, canSeeAcademics } from '../data/teachers';
import { SearchSelect } from '../components/ui/SearchSelect';
import { Avatar } from '../components/ui/Avatar';
import { PhoneLink } from '../components/ui/PhoneLink';
import { getSurahById } from '../data/surahs';
import { computeGoal, computeGoalStats } from '../lib/goalCalculations';
import { formatShortDate, WEEKDAYS_AR } from '../lib/dates';
import { WORKING_DAYS, FRIDAY, effectiveAttendanceDays } from '../lib/attendance';
import { formatAmountWithUnit, HALQA_LABELS } from '../lib/constants';
import { Card, Button, Chip } from '../components/ui/Primitives';
import { RadialProgress } from '../components/ui/StatCard';
import { GoalStatusBadge, GoalTypeBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { StudentFormModal } from '../components/students/StudentFormModal';
import { StudentBulletinModal } from '../components/students/StudentBulletinModal';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const student = useStudentsStore((s) => s.students.find((st) => st.id === id));
  const allGoals = useGoalsStore((s) => s.goals);
  const allRecords = useMemorizationStore((s) => s.records);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';
  const updateStudent = useStudentsStore((s) => s.updateStudent);
  const profiles = useTeacherProfilesStore((s) => s.profiles);
  const isSuperAdmin = isSuperTeacher(session?.teacherName);
  const academics = canSeeAcademics(session?.teacherName);
  const teacherName = useMemo(() => profiles.find((p) => p.id === student?.createdBy)?.name ?? 'غير محدَّد', [profiles, student]);

  function toggleAttendanceDay(day: number) {
    if (!student) return;
    const cur = effectiveAttendanceDays(student);
    const next = (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]).sort((a, b) => a - b);
    updateStudent(student.id, { attendanceDays: next });
  }
  const teacherOptions = useMemo(
    () => profiles.filter((p) => p.role !== 'supervisor').map((p) => ({ value: p.id, label: p.name })),
    [profiles],
  );
  const goals = useMemo(() => allGoals.filter((g) => g.studentId === id && g.type === halqa), [allGoals, id, halqa]);
  const records = useMemo(() => allRecords.filter((r) => r.studentId === id), [allRecords, id]);
  const [editOpen, setEditOpen] = useState(false);
  const [bulletinOpen, setBulletinOpen] = useState(false);

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
          <ArrowRight className="w-4 h-4" /> العودة إلى الطلاب
        </button>
        <Card>
          <EmptyState title="الطالب غير موجود" description="ربما تم حذف هذا الطالب." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate('/students')} className="flex items-center gap-1.5 text-sm text-bordeaux font-semibold w-fit hover:underline">
        <ArrowRight className="w-4 h-4" /> العودة إلى الطلاب
      </button>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {academics && (
            <div className="flex justify-center md:block shrink-0">
              <RadialProgress percentage={stats.averagePercentage ?? 0} size={140} label="معدل الإنجاز" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar photo={student.photo} name={student.fullName} size={56} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gold-dark tabular-nums">#{student.studentNumber}</span>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-ink break-words">{student.fullName}</h1>
                  </div>
                  <p className="text-sm text-ink-soft mt-1">{student.level}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {academics && (
                  <Button variant="secondary" size="sm" icon={<FileText className="w-3.5 h-3.5" />} onClick={() => setBulletinOpen(true)}>
                    تصدير بطاقة PDF
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditOpen(true)}>
                  تعديل
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-ink-soft">
              {student.guardianPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" /> <PhoneLink phone={student.guardianPhone} />
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> منذ {formatShortDate(student.joinDate)}
              </span>
              {academics && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> {records.length} سجلّ حفظ
                </span>
              )}
              {student.starred && (
                <span className="text-[11px] font-semibold bg-gold/20 text-gold-dark px-2 py-0.5 rounded-full">★ متميّز</span>
              )}
              {student.exempt && (
                <span className="text-[11px] font-semibold bg-teal/12 text-teal px-2 py-0.5 rounded-full">معفى من الأداء</span>
              )}
              {!student.active && (
                <span className="text-[11px] font-semibold bg-ink/8 text-ink-soft px-2 py-0.5 rounded-full">غير نشيط</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">الأستاذ المسؤول:</span>
              {isSuperAdmin ? (
                <div className="w-56">
                  <SearchSelect
                    options={teacherOptions}
                    value={student.createdBy ?? ''}
                    onChange={(newId) => updateStudent(student.id, { createdBy: newId })}
                    placeholder="غير محدَّد"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold text-ink">{teacherName}</span>
              )}
            </div>

            {student.notes && <p className="text-sm text-ink-soft mt-3 bg-cream rounded-lg p-3">{student.notes}</p>}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-1">أيام الحضور</h3>
        <p className="text-xs text-ink-soft mb-3">الجمعة عطلة. عدم اختيار أي يوم يعني الحضور في كل أيام العمل (السبت→الخميس).</p>
        <div className="flex flex-wrap items-center gap-2">
          {WORKING_DAYS.map((d) => (
            <Chip key={d} active={effectiveAttendanceDays(student).includes(d)} onClick={() => toggleAttendanceDay(d)}>
              {WEEKDAYS_AR[d]}
            </Chip>
          ))}
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ink/5 text-ink-soft/60">{WEEKDAYS_AR[FRIDAY]} (عطلة)</span>
        </div>
      </Card>

      {academics && (
        <>
      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">
          أهداف {HALQA_LABELS[halqa]} ({goals.length})
        </h3>
        {sortedGoals.length === 0 ? (
          <EmptyState title="لا توجد أهداف بعد" />
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {sortedGoals.map((g) => {
              const { status, percentage } = computeGoal(g);
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
        </>
      )}

      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} />
      <StudentBulletinModal open={bulletinOpen} onClose={() => setBulletinOpen(false)} student={student} goals={goals} />
    </div>
  );
}

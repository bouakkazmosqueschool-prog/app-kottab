import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Phone, ChevronLeft } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import { computeGoalStats } from '../lib/goalCalculations';
import { HALQA_LABELS } from '../lib/constants';
import { formatShortDate } from '../lib/dates';
import { SectionHeader, Card, Chip } from '../components/ui/Primitives';
import { TextInput } from '../components/ui/Field';
import { IconButton, Button } from '../components/ui/Primitives';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { StudentFormModal } from '../components/students/StudentFormModal';
import type { Student } from '../types';

type FilterMode = 'active' | 'inactive' | 'all';

export default function StudentsPage() {
  const students = useStudentsStore((s) => s.students);
  const removeStudent = useStudentsStore((s) => s.removeStudent);
  const allGoals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';
  const goals = useMemo(() => allGoals.filter((g) => g.type === halqa), [allGoals, halqa]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return students
      .filter((s) => (filter === 'all' ? true : filter === 'active' ? s.active : !s.active))
      .filter((s) => s.fullName.toLowerCase().includes(search.trim().toLowerCase()) || s.level.includes(search.trim()))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [students, filter, search]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="الطلاب"
        subtitle={`${HALQA_LABELS[halqa]} — ${students.filter((s) => s.active).length} طالباً نشيطاً من أصل ${students.length}`}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
            إضافة طالب
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Chip active={filter === 'active'} onClick={() => setFilter('active')}>
            النشيطون
          </Chip>
          <Chip active={filter === 'inactive'} onClick={() => setFilter('inactive')}>
            غير نشيطين
          </Chip>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            الكل
          </Chip>
        </div>
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-ink-soft absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <TextInput placeholder="البحث بالاسم أو المستوى..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="لا يوجد طلاب"
            description="لم يتم العثور على طلاب مطابقين. جرّب تغيير الفلتر أو أضف طالباً جديداً."
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>
                إضافة طالب
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((student) => {
            const stats = computeGoalStats(goals.filter((g) => g.studentId === student.id));
            return (
              <Card key={student.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/students/${student.id}`} className="min-w-0 group flex items-start gap-2">
                    <span className="text-xs font-bold text-gold-dark tabular-nums shrink-0 mt-0.5">#{student.studentNumber}</span>
                    <span className="min-w-0">
                      <p className="font-display font-bold text-ink truncate group-hover:text-bordeaux transition-colors">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5">{student.level}</p>
                    </span>
                  </Link>
                  {!student.active && (
                    <span className="text-[10px] font-semibold bg-ink/8 text-ink-soft px-2 py-0.5 rounded-full shrink-0">غير نشيط</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-ink-soft">
                  {student.guardianPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {student.guardianPhone}
                    </span>
                  )}
                  <span>منذ {formatShortDate(student.joinDate)}</span>
                </div>

                {stats.averagePercentage !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full bg-teal rounded-full"
                        style={{ width: `${Math.min(100, stats.averagePercentage)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-teal tabular-nums shrink-0">{stats.averagePercentage}%</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-line -mx-4 px-4 pt-3">
                  <Link to={`/students/${student.id}`} className="text-xs font-semibold text-bordeaux flex items-center gap-1 hover:underline">
                    عرض الملف
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <IconButton label="تعديل" onClick={() => openEdit(student)}>
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton label="حذف" onClick={() => setToDelete(student)} className="hover:text-clay">
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <StudentFormModal open={formOpen} onClose={() => setFormOpen(false)} student={editing} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removeStudent(toDelete.id)}
        title="حذف الطالب"
        message={`هل أنت متأكد من حذف "${toDelete?.fullName}"؟ سيتم حذف جميع أهدافه وسجلّ حفظه نهائياً. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائياً"
        danger
      />
    </div>
  );
}

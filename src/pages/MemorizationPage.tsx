import { useMemo, useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useMemorizationStore } from '../store/memorizationStore';
import { getSurahById } from '../data/surahs';
import { formatShortDate } from '../lib/dates';
import type { MemorizationRecord } from '../types';
import { SectionHeader, Card, Button, IconButton } from '../components/ui/Primitives';
import { Select } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { MemorizationFormModal } from '../components/memorization/MemorizationFormModal';

export default function MemorizationPage() {
  const students = useStudentsStore((s) => s.students);
  const records = useMemorizationStore((s) => s.records);
  const removeRecord = useMemorizationStore((s) => s.removeRecord);

  const [studentFilter, setStudentFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<MemorizationRecord | null>(null);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => (studentFilter === 'all' ? true : r.studentId === studentFilter))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [records, studentFilter]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="سجلّ الحفظ"
        subtitle={`${records.length} سجلّاً`}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
            إضافة سجلّ
          </Button>
        }
      />

      <div className="w-full sm:w-64">
        <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
          <option value="all">كل التلاميذ</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="لا يوجد سجلّ حفظ"
            description="ابدأ بإضافة أول سجلّ حفظ لتتبع تقدّم التلاميذ في القرآن الكريم."
            action={
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setFormOpen(true)}>
                إضافة سجلّ
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {filtered.map((r) => {
            const surah = getSurahById(r.surahId);
            const student = studentsById.get(r.studentId);
            return (
              <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-[130px]">
                  <p className="text-sm font-bold text-ink">{student?.fullName ?? 'تلميذ محذوف'}</p>
                  <p className="text-xs text-ink-soft">{formatShortDate(r.date)}</p>
                </div>
                <span className="font-display font-bold text-bordeaux-dark text-sm">{surah?.name}</span>
                <span className="text-xs text-ink-soft">
                  الآيات {r.startVerse}–{r.endVerse}
                </span>
                {r.notes && <span className="text-xs text-ink-soft italic">{r.notes}</span>}
                <IconButton label="حذف" onClick={() => setToDelete(r)} className="ms-auto hover:text-clay">
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            );
          })}
        </Card>
      )}

      <MemorizationFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && removeRecord(toDelete.id)}
        title="حذف السجلّ"
        message="هل أنت متأكد من حذف هذا السجلّ؟"
        confirmLabel="حذف"
        danger
      />
    </div>
  );
}

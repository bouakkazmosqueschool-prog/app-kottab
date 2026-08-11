import { useEffect, useState } from 'react';
import type { Student } from '../../types';
import { useStudentsStore } from '../../store/studentsStore';
import { todayISO } from '../../lib/dates';
import { STUDENT_LEVELS } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { FormField, TextInput, Select, DateInput, Textarea } from '../ui/Field';

interface Props {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
}

const EMPTY_FORM = {
  fullName: '',
  level: STUDENT_LEVELS[0],
  joinDate: todayISO(),
  notes: '',
};

export function StudentFormModal({ open, onClose, student }: Props) {
  const addStudent = useStudentsStore((s) => s.addStudent);
  const updateStudent = useStudentsStore((s) => s.updateStudent);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        fullName: student.fullName,
        level: student.level,
        joinDate: student.joinDate,
        notes: student.notes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [open, student]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }
    const payload = {
      fullName: form.fullName.trim(),
      level: form.level,
      joinDate: form.joinDate,
      notes: form.notes.trim() || undefined,
    };
    if (student) {
      updateStudent(student.id, payload);
    } else {
      addStudent(payload);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="student-form">
            {student ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="الاسم الكامل" required error={error}>
          <TextInput
            value={form.fullName}
            onChange={(e) => {
              setForm((f) => ({ ...f, fullName: e.target.value }));
              setError('');
            }}
            placeholder="مثال: محمد أمين"
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="المستوى">
            <Select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
              {STUDENT_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="تاريخ الالتحاق">
            <DateInput value={form.joinDate} onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))} />
          </FormField>
        </div>

        <FormField label="ملاحظات">
          <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." />
        </FormField>
      </form>
    </Modal>
  );
}

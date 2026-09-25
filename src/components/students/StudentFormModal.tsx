import { useEffect, useMemo, useState } from 'react';
import type { Student } from '../../types';
import { useStudentsStore } from '../../store/studentsStore';
import { todayISO } from '../../lib/dates';
import { STUDENT_LEVELS } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { FormField, TextInput, Select, DateInput, Textarea } from '../ui/Field';
import { Avatar } from '../ui/Avatar';
import { fileToThumbnail } from '../../lib/image';

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
  active: true,
  exempt: false,
  starred: false,
  photo: '',
};

const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ');

export function StudentFormModal({ open, onClose, student }: Props) {
  const addStudent = useStudentsStore((s) => s.addStudent);
  const updateStudent = useStudentsStore((s) => s.updateStudent);
  const students = useStudentsStore((s) => s.students);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  // تأكيد أنّ هذا طالب مختلف رغم تطابق الاسم مع طالب موجود
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // طالب موجود بنفس الاسم (لمنع الإدخال المكرَّر بالخطأ)
  const duplicate = useMemo(() => {
    const name = normalizeName(form.fullName).toLowerCase();
    if (!name) return null;
    return students.find((st) => st.id !== student?.id && normalizeName(st.fullName).toLowerCase() === name) ?? null;
  }, [students, form.fullName, student]);

  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        fullName: student.fullName,
        level: student.level,
        joinDate: student.joinDate,
        notes: student.notes ?? '',
        active: student.active,
        exempt: student.exempt,
        starred: student.starred,
        photo: student.photo ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
    setAllowDuplicate(false);
  }, [open, student]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }
    if (duplicate && !allowDuplicate) {
      setError(`يوجد طالب بنفس الاسم (#${duplicate.studentNumber}). فعّل التأكيد أدناه إن كان طالباً مختلفاً.`);
      return;
    }
    const payload = {
      fullName: form.fullName.trim(),
      level: form.level,
      joinDate: form.joinDate,
      notes: form.notes.trim() || undefined,
      active: form.active,
      exempt: form.exempt,
      starred: form.starred,
      photo: form.photo,
    };
    if (student) {
      updateStudent(student.id, payload);
    } else {
      addStudent(payload);
    }
    onClose();
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const thumb = await fileToThumbnail(file);
      setForm((f) => ({ ...f, photo: thumb }));
    } catch {
      setError('تعذّر تحميل الصورة');
    } finally {
      e.target.value = '';
    }
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
        <div className="flex items-center gap-4">
          <Avatar photo={form.photo || undefined} name={form.fullName} size={64} />
          <div className="flex flex-col gap-1 items-start">
            <label className="cursor-pointer text-sm font-semibold text-bordeaux hover:underline">
              {form.photo ? 'تغيير الصورة' : 'إضافة صورة'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {form.photo && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, photo: '' }))} className="text-xs text-clay hover:underline">
                حذف الصورة
              </button>
            )}
          </div>
        </div>

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

        {duplicate && (
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 flex flex-col gap-2">
            <p className="text-xs text-ink">
              ⚠ يوجد بالفعل طالب باسم <b>{duplicate.fullName}</b> (#{duplicate.studentNumber} — {duplicate.level}).
            </p>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => {
                  setAllowDuplicate(e.target.checked);
                  setError('');
                }}
                className="w-4 h-4 rounded border-line accent-bordeaux"
              />
              <span className="text-xs font-medium text-ink">هذا طالب مختلف رغم تطابق الاسم</span>
            </label>
          </div>
        )}

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

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="w-4 h-4 rounded border-line accent-bordeaux"
          />
          <span className="text-sm font-medium text-ink">طالب نشيط (لا يزال يتابع دراسته بالكُتّاب)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.exempt}
            onChange={(e) => setForm((f) => ({ ...f, exempt: e.target.checked }))}
            className="w-4 h-4 rounded border-line accent-bordeaux"
          />
          <span className="text-sm font-medium text-ink">معفى من الأداء (لا يُطالَب بالأداء الشهري)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.starred}
            onChange={(e) => setForm((f) => ({ ...f, starred: e.target.checked }))}
            className="w-4 h-4 rounded border-line accent-gold-dark"
          />
          <span className="text-sm font-medium text-ink">طالب متميّز (star)</span>
        </label>
      </form>
    </Modal>
  );
}

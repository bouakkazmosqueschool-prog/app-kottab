import { useEffect, useMemo, useState } from 'react';
import type { Student } from '../../types';
import { useStudentsStore } from '../../store/studentsStore';
import { useAuthStore } from '../../store/authStore';
import { isSuperTeacher } from '../../data/teachers';
import { supabase } from '../../lib/supabaseClient';
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
  guardianPhone: '',
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
  // الصورة ورقم الهاتف يُداران من المدير العام فقط
  const canManagePii = isSuperTeacher(useAuthStore((s) => s.session?.teacherName));
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  // طالب موجود بنفس الاسم ضمن التلاميذ المرئيين (تحقق فوري + احتياطي)
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
        guardianPhone: student.guardianPhone ?? '',
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
  }, [open, student]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.fullName.trim();
    if (!name) {
      setError('الاسم الكامل مطلوب');
      return;
    }
    // تحقق فوري ضمن التلاميذ المرئيين
    if (duplicate) {
      setError(`لا يمكن الحفظ: يوجد بالفعل طالب بنفس الاسم (#${duplicate.studentNumber}). يجب أن يكون اسم الطالب فريداً.`);
      return;
    }
    // تحقق موثوق من قاعدة البيانات عبر كل الأساتذة (يتجاوز RLS)
    setChecking(true);
    const { data, error: rpcErr } = await supabase.rpc('check_student_name', { p_name: name, p_exclude_id: student?.id ?? null });
    setChecking(false);
    if (!rpcErr) {
      const match = Array.isArray(data) && data.length > 0 ? (data[0] as { student_number: number; teacher_name: string | null }) : null;
      if (match) {
        setError(
          `لا يمكن الحفظ: يوجد بالفعل طالب بهذا الاسم (#${match.student_number})${match.teacher_name ? ` — الأستاذ: ${match.teacher_name}` : ' — بلا أستاذ'}.`,
        );
        return;
      }
    }
    const payload = {
      fullName: form.fullName.trim(),
      level: form.level,
      joinDate: form.joinDate,
      notes: form.notes.trim() || undefined,
      active: form.active,
      exempt: form.exempt,
      starred: form.starred,
      // الهاتف والصورة يُرسَلان فقط من المدير العام (حتى لا يُمحيا عند تعديل غيره لهما)
      ...(canManagePii ? { guardianPhone: form.guardianPhone.trim() || undefined, photo: form.photo } : {}),
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
          <Button type="submit" form="student-form" disabled={!!duplicate || checking}>
            {checking ? 'جارٍ التحقق...' : student ? 'حفظ التغييرات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {canManagePii && (
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
        )}

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
          <div className="rounded-xl border border-clay/40 bg-clay/10 p-3">
            <p className="text-xs font-semibold text-clay">
              ⚠ لا يمكن الحفظ: يوجد بالفعل طالب باسم <b>{duplicate.fullName}</b> (#{duplicate.studentNumber} — {duplicate.level}). يجب أن يكون الاسم فريداً.
            </p>
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

        {canManagePii && (
          <FormField label="رقم هاتف ولي الأمر">
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.guardianPhone}
              onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
              placeholder="مثال: 0612345678"
            />
          </FormField>
        )}

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
          <span className="text-sm font-medium text-ink">طالب متميّز</span>
        </label>
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useStudentsStore } from '../../store/studentsStore';
import { useMemorizationStore } from '../../store/memorizationStore';
import { isValidVerse } from '../../data/surahs';
import { todayISO } from '../../lib/dates';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { FormField, Select, DateInput, Textarea } from '../ui/Field';
import { SurahVersePicker } from './SurahVersePicker';

export function MemorizationFormModal({ open, onClose, presetStudentId }: { open: boolean; onClose: () => void; presetStudentId?: string }) {
  const allStudents = useStudentsStore((s) => s.students);
  const students = useMemo(() => allStudents.filter((st) => st.active), [allStudents]);
  const addRecord = useMemorizationStore((s) => s.addRecord);

  const [studentId, setStudentId] = useState('');
  const [surahId, setSurahId] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(7);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStudentId(presetStudentId ?? students[0]?.id ?? '');
    setSurahId(1);
    setStartVerse(1);
    setEndVerse(7);
    setDate(todayISO());
    setNotes('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError('يرجى اختيار تلميذ');
      return;
    }
    if (!isValidVerse(surahId, startVerse) || !isValidVerse(surahId, endVerse)) {
      setError('رقم الآية غير صحيح لهذه السورة');
      return;
    }
    if (endVerse < startVerse) {
      setError('رقم آية النهاية يجب أن يكون أكبر من أو يساوي البداية');
      return;
    }
    addRecord({ studentId, surahId, startVerse, endVerse, date, notes: notes.trim() || undefined });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة سجلّ حفظ"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="memorization-form">
            إضافة
          </Button>
        </>
      }
    >
      <form id="memorization-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="التلميذ" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.length === 0 && <option value="">لا يوجد تلاميذ نشيطون</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>
        </FormField>

        <SurahVersePicker
          surahId={surahId}
          startVerse={startVerse}
          endVerse={endVerse}
          error={error}
          onChange={(patch) => {
            if (patch.surahId !== undefined) setSurahId(patch.surahId);
            if (patch.startVerse !== undefined) setStartVerse(patch.startVerse);
            if (patch.endVerse !== undefined) setEndVerse(patch.endVerse);
            setError('');
          }}
        />

        <FormField label="التاريخ">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>

        <FormField label="ملاحظات (اختياري)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات حول جودة الحفظ..." />
        </FormField>
      </form>
    </Modal>
  );
}

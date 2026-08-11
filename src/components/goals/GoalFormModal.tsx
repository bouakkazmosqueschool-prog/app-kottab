import { useEffect, useMemo, useState } from 'react';
import type { GoalUnit, PeriodType } from '../../types';
import { useStudentsStore } from '../../store/studentsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { getWeekRange, getMonthRange, parseISODate, toISODate, todayISO, buildPeriodLabel } from '../../lib/dates';
import { GOAL_TYPE_LABELS, GOAL_UNIT_LABELS, UNITS_FOR_TYPE, DEFAULT_UNIT_FOR_TYPE, PERIOD_TYPE_LABELS } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button, Chip } from '../ui/Primitives';
import { FormField, Select, DateInput, NumberInput, Textarea } from '../ui/Field';

const PERIOD_TYPES: PeriodType[] = ['week', 'month', 'custom'];

export function GoalFormModal({ open, onClose, presetStudentId }: { open: boolean; onClose: () => void; presetStudentId?: string }) {
  const allStudents = useStudentsStore((s) => s.students);
  const students = useMemo(() => allStudents.filter((st) => st.active), [allStudents]);
  const addGoal = useGoalsStore((s) => s.addGoal);
  const defaultPeriodType = useSettingsStore((s) => s.settings.defaultPeriodType);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';

  const [studentId, setStudentId] = useState('');
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [refDate, setRefDate] = useState(todayISO());
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<GoalUnit>(DEFAULT_UNIT_FOR_TYPE[halqa]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStudentId(presetStudentId ?? students[0]?.id ?? '');
    setPeriodType(defaultPeriodType);
    setRefDate(todayISO());
    setCustomStart(todayISO());
    setCustomEnd(todayISO());
    setAmount('');
    setUnit(DEFAULT_UNIT_FOR_TYPE[halqa]);
    setNotes('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, halqa]);

  const { startISO, endISO, label } = useMemo(() => {
    if (periodType === 'week') {
      const { start, end } = getWeekRange(parseISODate(refDate));
      const s = toISODate(start);
      const e = toISODate(end);
      return { startISO: s, endISO: e, label: buildPeriodLabel('week', s, e) };
    }
    if (periodType === 'month') {
      const { start, end } = getMonthRange(parseISODate(refDate));
      const s = toISODate(start);
      const e = toISODate(end);
      return { startISO: s, endISO: e, label: buildPeriodLabel('month', s, e) };
    }
    return { startISO: customStart, endISO: customEnd, label: buildPeriodLabel('custom', customStart, customEnd) };
  }, [periodType, refDate, customStart, customEnd]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError('يرجى اختيار طالب');
      return;
    }
    if (endISO < startISO) {
      setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const amountNum = Number(amount);
    if (!amount || amountNum <= 0) {
      setError('أدخل المقدار المطلوب (رقم أكبر من صفر)');
      return;
    }
    addGoal({
      studentId,
      type: halqa,
      unit,
      targetAmount: amountNum,
      achievedAmount: null,
      periodType,
      periodLabel: label,
      startDate: startISO,
      endDate: endISO,
      teacherName: session?.teacherName,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`إضافة هدف ${GOAL_TYPE_LABELS[halqa]}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="goal-form">
            إضافة الهدف
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="الطالب" required>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.length === 0 && <option value="">لا يوجد طلاب نشيطون</option>}
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="نوع الفترة">
          <div className="flex gap-2">
            {PERIOD_TYPES.map((pt) => (
              <Chip key={pt} active={periodType === pt} onClick={() => setPeriodType(pt)}>
                {PERIOD_TYPE_LABELS[pt]}
              </Chip>
            ))}
          </div>
        </FormField>

        {periodType === 'custom' ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="تاريخ البداية">
              <DateInput value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </FormField>
            <FormField label="تاريخ النهاية">
              <DateInput value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </FormField>
          </div>
        ) : (
          <FormField label={periodType === 'week' ? 'أي يوم من الأسبوع المطلوب' : 'أي يوم من الشهر المطلوب'} hint={label}>
            <DateInput value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="المقدار المطلوب" required error={error}>
            <NumberInput min={0} step={0.25} placeholder="مثال: 1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField label="الوحدة">
            <Select value={unit} onChange={(e) => setUnit(e.target.value as GoalUnit)}>
              {UNITS_FOR_TYPE[halqa].map((u) => (
                <option key={u} value={u}>
                  {GOAL_UNIT_LABELS[u]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField label="ملاحظات (اختياري)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: الدورة الصيفية 2026..." />
        </FormField>
      </form>
    </Modal>
  );
}

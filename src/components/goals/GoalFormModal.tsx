import { useEffect, useMemo, useState } from 'react';
import type { GoalType, GoalUnit, PeriodType } from '../../types';
import { useStudentsStore } from '../../store/studentsStore';
import { useGoalsStore } from '../../store/goalsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getWeekRange, getMonthRange, parseISODate, toISODate, todayISO, buildPeriodLabel } from '../../lib/dates';
import { GOAL_TYPE_LABELS, GOAL_TYPE_DESCRIPTIONS, GOAL_UNIT_LABELS, UNITS_FOR_TYPE, PERIOD_TYPE_LABELS } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button, Chip } from '../ui/Primitives';
import { FormField, Select, DateInput, NumberInput, Textarea } from '../ui/Field';

const GOAL_TYPES: GoalType[] = ['hifz', 'murajaa', 'alwah'];
const PERIOD_TYPES: PeriodType[] = ['week', 'month', 'custom'];

export function GoalFormModal({ open, onClose, presetStudentId }: { open: boolean; onClose: () => void; presetStudentId?: string }) {
  const allStudents = useStudentsStore((s) => s.students);
  const students = useMemo(() => allStudents.filter((st) => st.active), [allStudents]);
  const addGoalsBatch = useGoalsStore((s) => s.addGoalsBatch);
  const defaultPeriodType = useSettingsStore((s) => s.settings.defaultPeriodType);

  const [studentId, setStudentId] = useState('');
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [refDate, setRefDate] = useState(todayISO());
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [amounts, setAmounts] = useState<Record<GoalType, { amount: string; unit: GoalUnit }>>({
    hifz: { amount: '', unit: 'hizb' },
    murajaa: { amount: '', unit: 'hizb' },
    alwah: { amount: '', unit: 'loh' },
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStudentId(presetStudentId ?? students[0]?.id ?? '');
    setPeriodType(defaultPeriodType);
    setRefDate(todayISO());
    setCustomStart(todayISO());
    setCustomEnd(todayISO());
    setNotes('');
    setAmounts({
      hifz: { amount: '', unit: 'hizb' },
      murajaa: { amount: '', unit: 'hizb' },
      alwah: { amount: '', unit: 'loh' },
    });
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  function updateAmount(type: GoalType, patch: Partial<{ amount: string; unit: GoalUnit }>) {
    setAmounts((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError('يرجى اختيار تلميذ');
      return;
    }
    if (endISO < startISO) {
      setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const entries = GOAL_TYPES.filter((t) => Number(amounts[t].amount) > 0).map((t) => ({
      studentId,
      type: t,
      unit: amounts[t].unit,
      targetAmount: Number(amounts[t].amount),
      achievedAmount: null,
      periodType,
      periodLabel: label,
      startDate: startISO,
      endDate: endISO,
      notes: notes.trim() || undefined,
    }));
    if (entries.length === 0) {
      setError('أدخل هدفاً واحداً على الأقل (حفظ، مراجعة أو ألواح)');
      return;
    }
    addGoalsBatch(entries);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة أهداف جديدة"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="goal-form">
            إضافة الأهداف
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-3">
          {GOAL_TYPES.map((t) => (
            <div key={t} className="border border-line rounded-xl p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ink">{GOAL_TYPE_LABELS[t]}</p>
                <p className="text-xs text-ink-soft">{GOAL_TYPE_DESCRIPTIONS[t]}</p>
              </div>
              <div className="w-24 shrink-0">
                <NumberInput
                  min={0}
                  step={0.5}
                  placeholder="0"
                  value={amounts[t].amount}
                  onChange={(e) => updateAmount(t, { amount: e.target.value })}
                />
              </div>
              <div className="w-28 shrink-0">
                <Select value={amounts[t].unit} onChange={(e) => updateAmount(t, { unit: e.target.value as GoalUnit })}>
                  {UNITS_FOR_TYPE[t].map((u) => (
                    <option key={u} value={u}>
                      {GOAL_UNIT_LABELS[u]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </div>

        <FormField label="ملاحظات (اختياري)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: الدورة الصيفية 2026..." />
        </FormField>

        {error && <p className="text-sm text-clay font-medium">{error}</p>}
      </form>
    </Modal>
  );
}

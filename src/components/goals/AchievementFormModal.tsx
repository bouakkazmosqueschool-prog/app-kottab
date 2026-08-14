import { useEffect, useState } from 'react';
import type { Goal } from '../../types';
import { useGoalsStore } from '../../store/goalsStore';
import { useAuthStore } from '../../store/authStore';
import { computeGoal } from '../../lib/goalCalculations';
import { formatAmountWithUnit, GOAL_TYPE_LABELS, GOAL_UNIT_LABELS } from '../../lib/constants';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { FormField, NumberInput, Textarea } from '../ui/Field';
import { GoalStatusBadge } from '../ui/Badge';

export function AchievementFormModal({
  goal,
  studentName,
  onClose,
}: {
  goal: Goal | null;
  studentName?: string;
  onClose: () => void;
}) {
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const session = useAuthStore((s) => s.session);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!goal) return;
    setAmount(goal.achievedAmount !== null ? String(goal.achievedAmount) : '');
    setNotes(goal.notes ?? '');
  }, [goal]);

  if (!goal) return null;

  const numeric = amount === '' ? null : Math.max(0, Number(amount));
  const preview = computeGoal({ targetAmount: goal.targetAmount, achievedAmount: numeric });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
    updateGoal(goal.id, {
      achievedAmount: numeric,
      notes: notes.trim() || undefined,
      teacherName: session?.teacherName ?? goal.teacherName,
    });
    onClose();
  }

  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title="تسجيل الإنجاز"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form="achievement-form">
            تسجيل الإنجاز
          </Button>
        </>
      }
    >
      <form id="achievement-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="bg-cream rounded-xl p-3.5">
          <p className="text-sm font-bold text-ink">{studentName}</p>
          <p className="text-xs text-ink-soft mt-0.5">
            {GOAL_TYPE_LABELS[goal.type]} — {goal.periodLabel}
          </p>
          <p className="text-xs text-ink-soft mt-1">المطلوب: {formatAmountWithUnit(goal.targetAmount, goal.unit)}</p>
        </div>

        <FormField label={`الكمية المنجزة (${GOAL_UNIT_LABELS[goal.unit]})`} required>
          <NumberInput min={0} step={0.25} autoFocus placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>

        {numeric !== null && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ink-soft">المعاينة:</span>
            <GoalStatusBadge status={preview.status} />
            {preview.percentage !== null && <span className="text-sm font-bold text-ink tabular-nums">{preview.percentage}%</span>}
          </div>
        )}

        <FormField label="ملاحظات (اختياري)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات حول أداء الطالب..." />
        </FormField>
      </form>
    </Modal>
  );
}

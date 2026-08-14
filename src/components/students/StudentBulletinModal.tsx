import { useMemo, useState } from 'react';
import type { Student, Goal, PeriodType } from '../../types';
import { computeGoal, computeGoalStats } from '../../lib/goalCalculations';
import { GOAL_TYPE_LABELS, HALQA_LABELS, formatAmountWithUnit, PERIOD_TYPE_LABELS } from '../../lib/constants';
import { formatShortDate, todayISO } from '../../lib/dates';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';
import { Button, Chip } from '../ui/Primitives';
import { DateInput } from '../ui/Field';
import { GoalStatusBadge } from '../ui/Badge';
import { RadialProgress } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';

type Scope = 'all' | 'period' | 'range';

export function StudentBulletinModal({
  open,
  onClose,
  student,
  goals,
}: {
  open: boolean;
  onClose: () => void;
  student: Student;
  goals: Goal[];
}) {
  const schoolName = useSettingsStore((s) => s.settings.schoolName);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? goals[0]?.type ?? 'hifz';

  const [scope, setScope] = useState<Scope>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const filtered = useMemo(() => {
    let list = [...goals];
    if (scope === 'period') {
      list = list.filter((g) => g.periodType === periodType);
    } else if (scope === 'range') {
      list = list.filter((g) => g.startDate >= dateFrom && g.endDate <= dateTo);
    }
    return list.sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  }, [goals, scope, periodType, dateFrom, dateTo]);

  const stats = useMemo(() => computeGoalStats(filtered), [filtered]);

  const scopeLabel = useMemo(() => {
    if (scope === 'all') return 'كل الفترات';
    if (scope === 'period') return PERIOD_TYPE_LABELS[periodType];
    return `${formatShortDate(dateFrom)} — ${formatShortDate(dateTo)}`;
  }, [scope, periodType, dateFrom, dateTo]);

  function handlePrint() {
    window.print();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تصدير بطاقة الطالب"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="no-print">
            إغلاق
          </Button>
          <Button onClick={handlePrint} className="no-print">
            طباعة / حفظ PDF
          </Button>
        </>
      }
    >
      <div className="no-print flex flex-wrap gap-2 mb-4">
        <Chip active={scope === 'all'} onClick={() => setScope('all')}>
          كل الفترات
        </Chip>
        <Chip active={scope === 'period'} onClick={() => setScope('period')}>
          حسب نوع الفترة
        </Chip>
        <Chip active={scope === 'range'} onClick={() => setScope('range')}>
          نطاق تواريخ محدد
        </Chip>
      </div>

      {scope === 'period' && (
        <div className="no-print flex gap-2 mb-4">
          {(['week', 'month', 'custom'] as PeriodType[]).map((pt) => (
            <Chip key={pt} active={periodType === pt} onClick={() => setPeriodType(pt)}>
              {PERIOD_TYPE_LABELS[pt]}
            </Chip>
          ))}
        </div>
      )}

      {scope === 'range' && (
        <div className="no-print grid grid-cols-2 gap-3 mb-4">
          <DateInput value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <DateInput value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      )}

      <div className="print-bulletin bg-paper rounded-xl border border-line p-6">
        <div className="flex items-center justify-between border-b-2 border-bordeaux pb-3 mb-4">
          <div>
            <p className="font-display font-bold text-bordeaux">{schoolName}</p>
            <p className="text-xs text-ink-soft mt-0.5">بطاقة تتبع الطالب — {HALQA_LABELS[halqa]}</p>
          </div>
          <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
        </div>

        <div className="flex items-start justify-between gap-4 text-sm mb-4">
          <div>
            <p className="text-[11px] text-ink-soft">الطالب</p>
            <p className="font-semibold text-ink">
              #{student.studentNumber} {student.fullName} — {student.level}
            </p>
          </div>
          <div className="text-end shrink-0">
            <p className="text-[11px] text-ink-soft">الفترة</p>
            <p className="font-semibold text-ink">{scopeLabel}</p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="لا توجد أهداف في هذه الفترة" />
        ) : (
          <>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="bg-cream text-ink-soft">
                  <th className="text-start p-2 font-semibold">النوع</th>
                  <th className="text-start p-2 font-semibold">الفترة</th>
                  <th className="text-start p-2 font-semibold">المطلوب</th>
                  <th className="text-start p-2 font-semibold">المنجز</th>
                  <th className="text-start p-2 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const { status } = computeGoal(g);
                  return (
                    <tr key={g.id} className="border-b border-line">
                      <td className="p-2">{GOAL_TYPE_LABELS[g.type]}</td>
                      <td className="p-2 text-ink-soft whitespace-nowrap">{g.periodLabel}</td>
                      <td className="p-2 whitespace-nowrap">{formatAmountWithUnit(g.targetAmount, g.unit)}</td>
                      <td className="p-2 whitespace-nowrap">
                        {g.achievedAmount !== null ? formatAmountWithUnit(g.achievedAmount, g.unit) : '—'}
                      </td>
                      <td className="p-2">
                        <GoalStatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center gap-4 bg-cream rounded-lg p-4 mb-4">
              <RadialProgress percentage={stats.averagePercentage ?? 0} size={64} />
              <div>
                <p className="text-sm font-bold text-ink">معدل الإنجاز خلال هذه الفترة</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  محسوب من متوسط {stats.total - stats.pending} هدفاً مسجَّلاً من أصل {stats.total}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between text-[11px] text-ink-soft border-t border-line pt-2">
          <span>تاريخ الإصدار: {formatShortDate(todayISO())}</span>
          <span>الأستاذ: {session?.teacherName ?? '................'}</span>
        </div>
      </div>
    </Modal>
  );
}

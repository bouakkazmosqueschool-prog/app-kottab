import { BookOpen, Repeat, PenLine, Clock, XCircle, CheckCircle2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { GoalStatus, GoalType } from '../../types';
import { STATUS_LABELS } from '../../lib/goalCalculations';
import { GOAL_TYPE_LABELS } from '../../lib/constants';

const STATUS_STYLES: Record<GoalStatus, string> = {
  pending: 'bg-ink/6 text-ink-soft',
  incomplete: 'bg-clay/10 text-clay',
  completed: 'bg-teal/10 text-teal',
  completed_plus: 'bg-gold/20 text-bordeaux-dark',
};

const STATUS_ICONS: Record<GoalStatus, typeof Clock> = {
  pending: Clock,
  incomplete: XCircle,
  completed: CheckCircle2,
  completed_plus: Sparkles,
};

export function GoalStatusBadge({ status, className }: { status: GoalStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        STATUS_STYLES[status],
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const TYPE_ICONS: Record<GoalType, typeof BookOpen> = {
  hifz: BookOpen,
  murajaa: Repeat,
  alwah: PenLine,
};

export function GoalTypeBadge({ type, className }: { type: GoalType; className?: string }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg bg-bordeaux/8 text-bordeaux-dark px-2.5 py-1 text-xs font-bold whitespace-nowrap',
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
      {GOAL_TYPE_LABELS[type]}
    </span>
  );
}

import type { ComponentType } from 'react';
import clsx from 'clsx';
import { Card } from './Primitives';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const TONE_CLASSES = {
  default: 'bg-bordeaux/8 text-bordeaux-dark',
  gold: 'bg-gold/25 text-bordeaux-dark',
  teal: 'bg-teal/10 text-teal',
  clay: 'bg-clay/10 text-clay',
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: IconType;
  label: string;
  value: string | number;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card className="p-4 md:p-5 flex items-center gap-4">
      <div className={clsx('h-11 w-11 shrink-0 rounded-xl flex items-center justify-center', TONE_CLASSES[tone])}>
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-ink tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-ink-soft truncate">{label}</p>
      </div>
    </Card>
  );
}

function buildStarPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 8) * i;
    pts.push(`${(cx + r * Math.sin(angle)).toFixed(2)},${(cy - r * Math.cos(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * عنصر التصميم المميّز: حلقة تقدّم دائرية محاطة بنجمة ثمانية الرؤوس
 * مستوحاة من الزخرفة الزليجية المغربية، تُستعمل لعرض معدّل الإنجاز العام.
 */
export function RadialProgress({
  percentage,
  size = 176,
  label,
}: {
  percentage: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeWidth = size * 0.055;
  const radius = size * 0.36;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const starOuterR = size * 0.47;
  const starInnerR = size * 0.4;

  const color =
    clamped >= 100
      ? 'var(--color-gold-dark)'
      : clamped >= 60
        ? 'var(--color-teal)'
        : clamped >= 40
          ? 'var(--color-gold-dark)'
          : 'var(--color-clay)';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={buildStarPoints(center, center, starOuterR, starInnerR)}
          fill="none"
          stroke="var(--color-gold)"
          strokeOpacity={0.3}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <span className="font-display text-3xl font-bold text-ink tabular-nums">{Math.round(percentage)}%</span>
        {label && <span className="text-[11px] text-ink-soft mt-1 text-center leading-tight">{label}</span>}
      </div>
    </div>
  );
}

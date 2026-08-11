import type { GoalType, GoalUnit, Halqa, PeriodType } from '../types';

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  hifz: 'حفظ',
  murajaa: 'مراجعة',
  alwah: 'الألواح',
};

export const GOAL_TYPE_DESCRIPTIONS: Record<GoalType, string> = {
  hifz: 'حفظ آيات جديدة من القرآن الكريم',
  murajaa: 'مراجعة وتثبيت المحفوظ سابقاً',
  alwah: 'كتابة وتصحيح الألواح',
};

/** كل حلقة تقابل تماماً نوع عمل واحد */
export const HALQA_LABELS: Record<Halqa, string> = {
  hifz: 'حلقة الحفظ',
  murajaa: 'حلقة المراجعة',
  alwah: 'حلقة تصحيح الألواح',
};

export const GOAL_UNIT_LABELS: Record<GoalUnit, string> = {
  aya: 'آية',
  thumn: 'ثمن',
  rub: 'ربع',
  nisf: 'نصف',
  hizb: 'حزب',
};

/** نفس الوحدات متاحة لكل أنواع الأهداف الثلاثة (حفظ / مراجعة / ألواح) */
const ALL_UNITS: GoalUnit[] = ['aya', 'thumn', 'rub', 'nisf', 'hizb'];
export const UNITS_FOR_TYPE: Record<GoalType, GoalUnit[]> = {
  hifz: ALL_UNITS,
  murajaa: ALL_UNITS,
  alwah: ALL_UNITS,
};

export const DEFAULT_UNIT_FOR_TYPE: Record<GoalType, GoalUnit> = {
  hifz: 'hizb',
  murajaa: 'hizb',
  alwah: 'rub',
};

export const STUDENT_LEVELS = ['المستوى الأول', 'المستوى الثاني', 'المستوى الثالث'];

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  week: 'أسبوع',
  month: 'شهر',
  custom: 'فترة مخصصة',
};

export function formatAmount(amount: number): string {
  // نعرض الأرقام العشرية بأقل عدد ممكن من الخانات (1 وليس 1.00 / 1.5 وليس 1.50)
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '');
}

export function formatAmountWithUnit(amount: number, unit: GoalUnit): string {
  return `${formatAmount(amount)} ${GOAL_UNIT_LABELS[unit]}`;
}

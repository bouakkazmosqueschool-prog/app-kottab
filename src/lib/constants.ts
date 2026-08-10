import type { GoalType, GoalUnit, PeriodType } from '../types';

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

export const GOAL_UNIT_LABELS: Record<GoalUnit, string> = {
  hizb: 'حزب',
  juz: 'جزء',
  rub: 'ربع حزب',
  wajh: 'وجه',
  loh: 'لوح',
};

/** الوحدات المسموح بها لكل نوع هدف */
export const UNITS_FOR_TYPE: Record<GoalType, GoalUnit[]> = {
  hifz: ['hizb', 'juz', 'rub', 'wajh'],
  murajaa: ['hizb', 'juz', 'rub', 'wajh'],
  alwah: ['loh'],
};

export const DEFAULT_UNIT_FOR_TYPE: Record<GoalType, GoalUnit> = {
  hifz: 'hizb',
  murajaa: 'hizb',
  alwah: 'loh',
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

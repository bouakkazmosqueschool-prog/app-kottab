import type { PeriodType } from '../types';

/** أسماء الأشهر كما تُستعمل في المغرب (وليس الأسماء المشرقية) */
export const MONTHS_MA = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'ماي',
  'يونيو',
  'يوليوز',
  'غشت',
  'شتنبر',
  'أكتوبر',
  'نونبر',
  'دجنبر',
];

/** فهرس 0 = الأحد ليطابق Date.getDay() */
export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** يحوّل نصاً بصيغة yyyy-mm-dd إلى تاريخ محلي عند منتصف الليل (يتفادى مشاكل التوقيت العالمي) */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** يعيد بداية (الاثنين) ونهاية (الأحد) الأسبوع المحتوي للتاريخ المعطى */
/** الأسبوع عندنا يبدأ يوم السبت وينتهي يوم الجمعة */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay(); // 0=Sunday..6=Saturday
  const diffToSaturday = (day + 1) % 7;
  const start = addDays(date, -diffToSaturday);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  return { start, end };
}

/** يعيد أول وآخر يوم من الشهر المحتوي للتاريخ المعطى */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_MA[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS_AR[d.getDay()]}، ${d.getDate()} ${MONTHS_MA[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayMonth(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_MA[d.getMonth()]}`;
}

/** يبني تسمية عربية واضحة للفترة حسب نوعها */
export function buildPeriodLabel(type: PeriodType, startISO: string, endISO: string): string {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (type === 'month') {
    return `شهر ${MONTHS_MA[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (type === 'week') {
    if (start.getMonth() === end.getMonth()) {
      return `الأسبوع من ${start.getDate()} إلى ${end.getDate()} ${MONTHS_MA[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `الأسبوع من ${formatShortDate(startISO)} إلى ${formatShortDate(endISO)}`;
  }
  // custom
  if (startISO === endISO) return formatShortDate(startISO);
  return `من ${formatShortDate(startISO)} إلى ${formatShortDate(endISO)}`;
}

/** مفتاح تجميع أسبوعي مستقر للفرز والرسوم البيانية (اثنين كل أسبوع بصيغة ISO) */
export function weekBucketKey(iso: string): string {
  const { start } = getWeekRange(parseISODate(iso));
  return toISODate(start);
}

export function weekBucketLabel(iso: string): string {
  const { start, end } = getWeekRange(parseISODate(iso));
  return `${start.getDate()}-${end.getDate()} ${MONTHS_MA[end.getMonth()]}`;
}

/** مفتاح تجميع شهري بصيغة yyyy-mm */
export function monthBucketKey(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthBucketLabel(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS_MA[d.getMonth()]} ${d.getFullYear()}`;
}

export function isDateInRange(iso: string, startISO?: string, endISO?: string): boolean {
  if (startISO && iso < startISO) return false;
  if (endISO && iso > endISO) return false;
  return true;
}

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

// ============================================================
// شهر الأداء (بصيغة yyyy-mm) — للأداءات الشهرية والتنبيهات
// ============================================================

/** شهر التاريخ المعطى بصيغة yyyy-mm */
export function monthPeriodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** الشهر الحالي بصيغة yyyy-mm */
export function currentMonthPeriod(): string {
  return monthPeriodOf(new Date());
}

/** رقم اليوم في الشهر الحالي (1..31) — يُستعمل لبدء التنبيه من اليوم 3 */
export function currentDayOfMonth(): number {
  return new Date().getDate();
}

/** تسمية عربية للشهر: "يناير 2026" */
export function formatMonthPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${MONTHS_MA[(m ?? 1) - 1]} ${y}`;
}

/**
 * يبني قائمة الأشهر المتاحة للفلترة، من أقدم شهر معطى إلى الشهر الحالي
 * (تنازلياً: الأحدث أولاً). إن لم تُعطَ أشهر سابقة يُرجع الشهر الحالي فقط.
 */
export function monthPeriodsUpToNow(existingPeriods: string[]): string[] {
  const current = currentMonthPeriod();
  const all = new Set<string>([current, ...existingPeriods]);
  const earliest = Array.from(all).sort()[0] ?? current;
  const [ey, em] = earliest.split('-').map(Number);
  const [cy, cm] = current.split('-').map(Number);
  const result: string[] = [];
  let y = ey;
  let m = em;
  while (y < cy || (y === cy && m <= cm)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result.reverse();
}

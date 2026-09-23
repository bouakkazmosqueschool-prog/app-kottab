import type { Student } from '../types';

/** أيام العمل بترتيب العرض: السبت→الخميس (فهارس getDay: السبت=6، الأحد=0 ... الخميس=4) */
export const WORKING_DAYS = [6, 0, 1, 2, 3, 4];
/** الجمعة عطلة */
export const FRIDAY = 5;

/** أيام حضور التلميذ الفعلية — القائمة الفارغة تعني كل أيام العمل (الوضع الافتراضي) */
export function effectiveAttendanceDays(student: Pick<Student, 'attendanceDays'>): number[] {
  return student.attendanceDays.length ? student.attendanceDays : WORKING_DAYS;
}

/** هل يحضر التلميذ في هذا اليوم من الأسبوع (فهرس getDay)؟ */
export function attendsOn(student: Pick<Student, 'attendanceDays'>, weekday: number): boolean {
  if (weekday === FRIDAY) return false;
  return effectiveAttendanceDays(student).includes(weekday);
}

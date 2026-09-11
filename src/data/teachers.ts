import type { Halqa, TeacherRole } from '../types';

export interface TeacherAccount {
  name: string;
  email: string;
  role: TeacherRole;
}

/**
 * الحسابات المتاحة في القائمة المنسدلة بصفحة الدخول. البريد الإلكتروني
 * تقني (غير حقيقي) يُستعمل فقط داخلياً مع Supabase Auth — يبقى غير ظاهر
 * للمستخدم الذي يرى فقط الاسم بالعربية. يجب أن تطابق هذه القائمة تماماً
 * ما هو موجود في supabase/seed-teachers.mjs، وحقل role يطابق teacher_profiles.role.
 */
export const TEACHER_ACCOUNTS: TeacherAccount[] = [
  { name: 'عبد الحق فضلي', email: 'abdelhaq.fadli@kottab.local', role: 'super_admin' },
  { name: 'أحمد الزموري', email: 'ahmed.zemmouri@kottab.local', role: 'supervisor' },
  { name: 'أحمد بحلا', email: 'ahmed.bahla@kottab.local', role: 'teacher' },
  { name: 'رحال البطوشي', email: 'rahal.batouchi@kottab.local', role: 'teacher' },
  { name: 'عبد الله بوسكنيت', email: 'abdellah.bouseknite@kottab.local', role: 'teacher' },
  { name: 'أيوب العشاوي', email: 'ayoub.achaoui@kottab.local', role: 'teacher' },
  { name: 'محمد بن اليازيد', email: 'mohamed.benyazid@kottab.local', role: 'teacher' },
  { name: 'أيوب أيت نصر', email: 'ayoub.aitnasr@kottab.local', role: 'teacher' },
  { name: 'إبراهيم أيت سعيد', email: 'ibrahim.aitsaid@kottab.local', role: 'teacher' },
  { name: 'عبد الرحمن أسقراي', email: 'abderrahman.asqrai@kottab.local', role: 'teacher' },
  { name: 'مصطفى لبيهي', email: 'mustapha.labihi@kottab.local', role: 'teacher' },
  { name: 'أحمد الراجي', email: 'ahmed.raji@kottab.local', role: 'teacher' },
];

const DEFAULT_HALQAS: Halqa[] = ['hifz', 'murajaa', 'alwah'];
const IJAZA_TEACHER_EMAIL = 'abdelhaq.fadli@kottab.local';

/** المدير العام الذي يرى كل شيء (تلاميذ + أهداف + إنجاز + تقارير). */
export const SUPER_TEACHER_NAME = 'عبد الحق فضلي';
/** المشرف المالي الذي يرى كل التلاميذ ويسجّل الأداءات فقط. */
export const SUPERVISOR_TEACHER_NAME = 'أحمد الزموري';

/** التسميات العربية للأدوار (تظهر في الواجهة). */
export const ROLE_LABELS: Record<TeacherRole, string> = {
  teacher: 'أستاذ',
  super_admin: 'المدير العام',
  supervisor: 'المشرف المالي',
};

/** دور الحساب حسب الاسم (المرجع في الواجهة). */
export function getTeacherRole(teacherName?: string): TeacherRole {
  return TEACHER_ACCOUNTS.find((t) => t.name === teacherName)?.role ?? 'teacher';
}

/** المدير العام: يرى كل شيء (يُستعمل لعزل الأهداف/الإنجاز/التقارير). */
export function isSuperTeacher(teacherName?: string): boolean {
  return getTeacherRole(teacherName) === 'super_admin';
}

/** المشرف المالي فقط. */
export function isSupervisor(teacherName?: string): boolean {
  return getTeacherRole(teacherName) === 'supervisor';
}

/** من يرى قائمة كل التلاميذ: المدير العام والمشرف المالي. */
export function canSeeAllStudents(teacherName?: string): boolean {
  const role = getTeacherRole(teacherName);
  return role === 'super_admin' || role === 'supervisor';
}

/** من يرى الأهداف/الإنجاز/التقارير: الأستاذ العادي والمدير العام (وليس المشرف المالي). */
export function canSeeAcademics(teacherName?: string): boolean {
  const role = getTeacherRole(teacherName);
  return role === 'teacher' || role === 'super_admin';
}

/** من يسجّل الأداءات: المشرف المالي فقط. */
export function canRecordPayments(teacherName?: string): boolean {
  return getTeacherRole(teacherName) === 'supervisor';
}

/** حلقات الأستاذ المتاحة في الواجهة. الحلقتان الخاصتان مخصّصتان لعبد الحق فضلي فقط. */
export function getAvailableHalqas(teacherName?: string): Halqa[] {
  const teacher = TEACHER_ACCOUNTS.find((account) => account.name === teacherName);
  return teacher?.email === IJAZA_TEACHER_EMAIL ? [...DEFAULT_HALQAS, 'ijaza', 'tajwid'] : DEFAULT_HALQAS;
}

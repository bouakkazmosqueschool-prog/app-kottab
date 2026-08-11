import type { Teacher } from '../types';

/**
 * حسابات تجريبية للأساتذة. كلمات المرور بسيطة عمداً (نسخة محلية تجريبية
 * بدون خادم حقيقي) — تُعرض للمستخدم مباشرة في صفحة الدخول لتسهيل التجربة.
 */
export const TEACHERS: Teacher[] = [
  { id: 'teacher-1', name: 'عبد الحق فضلي', password: '1234' },
  { id: 'teacher-2', name: 'أحمد بحلا', password: '1234' },
  { id: 'teacher-3', name: 'الأستاذ 1', password: '1234' },
  { id: 'teacher-4', name: 'الأستاذ 2', password: '1234' },
];

export function findTeacher(name: string, password: string): Teacher | undefined {
  const normalized = name.trim();
  return TEACHERS.find((t) => t.name === normalized && t.password === password);
}

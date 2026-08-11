import type { Teacher } from '../types';

/**
 * حسابات تجريبية للمعلمين. كلمات المرور بسيطة عمداً (نسخة محلية تجريبية
 * بدون خادم حقيقي) — تُعرض للمستخدم مباشرة في صفحة الدخول لتسهيل التجربة.
 */
export const TEACHERS: Teacher[] = [
  { id: 'teacher-1', name: 'محمد العلوي', password: '1234' },
  { id: 'teacher-2', name: 'خديجة بنسعيد', password: '1234' },
  { id: 'teacher-3', name: 'يوسف الإدريسي', password: '1234' },
  { id: 'teacher-4', name: 'سعاد بنجلون', password: '1234' },
  { id: 'teacher-5', name: 'عبد الكريم الوردي', password: '1234' },
];

export function findTeacher(name: string, password: string): Teacher | undefined {
  const normalized = name.trim();
  return TEACHERS.find((t) => t.name === normalized && t.password === password);
}

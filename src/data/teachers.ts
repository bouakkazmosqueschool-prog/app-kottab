export interface TeacherAccount {
  name: string;
  email: string;
}

/**
 * الحسابات المتاحة في القائمة المنسدلة بصفحة الدخول. البريد الإلكتروني
 * تقني (غير حقيقي) يُستعمل فقط داخلياً مع Supabase Auth — يبقى غير ظاهر
 * للمستخدم الذي يرى فقط الاسم بالعربية. يجب أن تطابق هذه القائمة تماماً
 * ما هو موجود في supabase/seed-teachers.mjs.
 */
export const TEACHER_ACCOUNTS: TeacherAccount[] = [
  { name: 'عبد الحق فضلي', email: 'abdelhaq.fadli@kottab.local' },
  { name: 'أحمد بحلا', email: 'ahmed.bahla@kottab.local' },
  { name: 'الأستاذ 1', email: 'teacher1@kottab.local' },
  { name: 'الأستاذ 2', email: 'teacher2@kottab.local' },
];

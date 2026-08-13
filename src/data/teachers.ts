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
  { name: 'رحال البطوشي', email: 'rahal.batouchi@kottab.local' },
  { name: 'عبد الله بوسكنيت', email: 'abdellah.bouseknite@kottab.local' },
  { name: 'أيوب العشاوي', email: 'ayoub.achaoui@kottab.local' },
  { name: 'محمد بن اليازيد', email: 'mohamed.benyazid@kottab.local' },
  { name: 'أيوب أيت نصر', email: 'ayoub.aitnasr@kottab.local' },
  { name: 'إبراهيم أيت سعيد', email: 'ibrahim.aitsaid@kottab.local' },
  { name: 'عبد الرحمن أسقراي', email: 'abderrahman.asqrai@kottab.local' },
  { name: 'مصطفى لبيهي', email: 'mustapha.labihi@kottab.local' },
  { name: 'أحمد الراجي', email: 'ahmed.raji@kottab.local' },
];

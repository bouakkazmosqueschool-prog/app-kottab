// ============================================================
// سكريبت تهيئة حسابات الأساتذة في Supabase Auth
//
// شروط مسبقة قبل التشغيل:
// 1) نفّذ ملف supabase/schema.sql في SQL Editor أولاً
// 2) في Supabase Dashboard → Authentication → Sign In / Providers → Email:
//    عطّل خيار "Confirm email" (وإلا لن تعمل الحسابات مباشرة بدون تأكيد بريد وهمي)
//
// طريقة التشغيل (من جهازك، مرة واحدة فقط):
//   cd kottab
//   npm install
//   node supabase/seed-teachers.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szypbjvhwaiblnqqevbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O5uvHYwyDZUgG2crQtj1dQ_7VO0pzgx';

// يجب أن تطابق تماماً القائمة في src/data/teachers.ts
const TEACHERS = [
  { name: 'عبد الحق فضلي', email: 'abdelhaq.fadli@kottab.local' },
  { name: 'أحمد بحلا', email: 'ahmed.bahla@kottab.local' },
  { name: 'الأستاذ 1', email: 'teacher1@kottab.local' },
  { name: 'الأستاذ 2', email: 'teacher2@kottab.local' },
];
const PASSWORD = '1234';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

for (const t of TEACHERS) {
  console.log(`\nإنشاء حساب: ${t.name} (${t.email})...`);

  const { data, error } = await supabase.auth.signUp({ email: t.email, password: PASSWORD });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('  ⚠ الحساب موجود مسبقاً، تخطّي.');
    } else {
      console.error(`  ✗ خطأ: ${error.message}`);
    }
    continue;
  }

  const userId = data.user?.id;
  if (!userId) {
    console.error('  ✗ تعذر الحصول على معرّف المستخدم. تحقق من تعطيل "Confirm email".');
    continue;
  }

  const { error: profileError } = await supabase.from('teacher_profiles').insert({ id: userId, name: t.name });

  if (profileError) {
    console.error(`  ✗ خطأ في إنشاء الملف الشخصي: ${profileError.message}`);
  } else {
    console.log('  ✓ تم بنجاح');
  }

  // تسجيل الخروج قبل إنشاء الحساب التالي (signUp يسجّل الدخول تلقائياً)
  await supabase.auth.signOut();
}

console.log('\nانتهى. يمكنك الآن تسجيل الدخول من صفحة التطبيق بأي من هذه الحسابات (كلمة المرور: 1234).');
process.exit(0);

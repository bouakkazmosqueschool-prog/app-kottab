import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** يصبح true إذا كانت متغيرات البيئة الخاصة بـ Supabase مضبوطة فعلاً */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // نطبع تحذيراً واضحاً بدل فشل صامت — يساعد كثيراً أثناء الإعداد الأول
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] متغيرات البيئة VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY غير مضبوطة. ' +
      'انسخ .env.example إلى .env.local وضع فيه قيم مشروعك.',
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

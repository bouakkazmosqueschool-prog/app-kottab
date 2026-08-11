import { createClient } from '@supabase/supabase-js';

/**
 * القيم الافتراضية هنا هي مفتاح anon/publishable — مصمَّم عمداً ليكون
 * علنياً وآمناً للتضمين في كود العميل (الحماية الحقيقية تأتي من قواعد
 * RLS في قاعدة البيانات، وليس من سرّية هذا المفتاح). نكتبها هنا مباشرة
 * لأن بعض منصّات النشر (مثل Cloudflare Workers بأصول ثابتة فقط) لا
 * تسمح بإضافة متغيرات بيئة وقت البناء. يمكن مع ذلك تجاوزها عبر
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY إن وُجدت (مثلاً في التطوير
 * المحلي عبر .env.local لمشروع Supabase مختلف).
 */
const DEFAULT_SUPABASE_URL = 'https://szypbjvhwaiblnqqevbw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_O5uvHYwyDZUgG2crQtj1dQ_7VO0pzgx';

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

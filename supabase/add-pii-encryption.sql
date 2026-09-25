-- ============================================================
-- تشفير البيانات الشخصية (هاتف ولي الأمر + صورة التلميذ)
--
-- المبدأ: مفتاح تشفير عشوائي يُخزَّن في Supabase Vault (مشفَّراً).
-- دالة get_pii_key() تُرجع المفتاح للمستخدمين المسجَّلين فقط، فيقوم المتصفح
-- بالتشفير قبل الحفظ وفكّ التشفير عند العرض (AES-GCM). قاعدة البيانات لا
-- تحتوي إلا نصاً مشفَّراً، وتفريغ جدول students وحده لا يكشف المفتاح.
--
-- لا يمسّ أي بيانات موجودة (الأعمدة نصية أصلاً). idempotent.
-- الاستعمال: Supabase Dashboard → SQL Editor → Run.
-- ============================================================

-- 1) إنشاء مفتاح PII في Vault إن لم يكن موجوداً (32 بايت عشوائية، base64)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_key') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'base64'), 'pii_key', 'مفتاح تشفير الهاتف والصورة');
  end if;
end $$;

-- 2) دالة تُرجع المفتاح للمستخدمين المسجَّلين فقط (المفتاح لا يظهر في كود التطبيق)
create or replace function public.get_pii_key()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pii_key' limit 1;
$$;

revoke all on function public.get_pii_key() from public;
grant execute on function public.get_pii_key() to authenticated;

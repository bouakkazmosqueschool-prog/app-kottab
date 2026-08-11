-- ============================================================
-- إنشاء حسابات الأساتذة الأربعة — SQL خالص، بدون أي سكريبت خارجي
-- طريقة الاستعمال: انسخ والصق في Supabase Dashboard → SQL Editor → Run
--
-- ملاحظة: هذا السكريبت يكتب مباشرة في جداول Supabase الداخلية
-- (auth.users و auth.identities). إن فشل بسبب اختلاف في نسخة
-- المشروع، ارجع للطريقة اليدوية عبر Authentication → Users
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  v_teachers jsonb := '[
    {"name": "عبد الحق فضلي", "email": "abdelhaq.fadli@kottab.local"},
    {"name": "أحمد بحلا", "email": "ahmed.bahla@kottab.local"},
    {"name": "الأستاذ 1", "email": "teacher1@kottab.local"},
    {"name": "الأستاذ 2", "email": "teacher2@kottab.local"}
  ]';
  v_teacher jsonb;
  v_user_id uuid;
  v_password text := '1234';
begin
  for v_teacher in select * from jsonb_array_elements(v_teachers)
  loop
    -- تخطّي إن كان الحساب موجوداً مسبقاً (يمكن إعادة تشغيل السكريبت بأمان)
    if exists (select 1 from auth.users where email = v_teacher->>'email') then
      raise notice 'الحساب موجود مسبقاً، تخطّي: %', v_teacher->>'email';
      continue;
    end if;

    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_teacher->>'email', crypt(v_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', v_teacher->>'email'),
      'email', now(), now(), now()
    );

    insert into teacher_profiles (id, name) values (v_user_id, v_teacher->>'name');

    raise notice 'تم إنشاء: % (%)', v_teacher->>'name', v_teacher->>'email';
  end loop;
end $$;

-- تحقّق من النتيجة
select u.email, t.name
from auth.users u
join teacher_profiles t on t.id = u.id
where u.email like '%@kottab.local'
order by u.created_at;

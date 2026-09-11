-- ============================================================
-- الأدوار (أستاذ / مدير عام / مشرف مالي) + جدول الأداءات الشهرية
--
-- الأدوار:
--   • teacher      : أستاذ عادي — يرى تلاميذه فقط
--   • super_admin  : المدير العام (عبد الحق فضلي) — يرى كل شيء
--   • supervisor   : المشرف المالي (أحمد الزموري) — يرى كل التلاميذ ويسجّل الأداءات
--
-- شرط مسبق: نفّذ supabase/add-student-ownership.sql أولاً (عمود created_by والدوال).
-- وأنشئ حساب أحمد الزموري عبر node supabase/seed-teachers.mjs قبل تشغيل هذا الملف
-- (حتى يوجد صفّه في teacher_profiles ليأخذ الدور supervisor).
--
-- الاستعمال: Supabase Dashboard → SQL Editor → New query → الصق → Run. idempotent.
-- ============================================================

-- 1) عمود الدور على جدول الأساتذة
alter table teacher_profiles
  add column if not exists role text not null default 'teacher'
  check (role in ('teacher', 'super_admin', 'supervisor'));

-- ترحيل: المدير العام والمشرف المالي
update teacher_profiles set role = 'super_admin' where is_super = true or name = 'عبد الحق فضلي';
update teacher_profiles set role = 'supervisor' where name = 'أحمد الزموري';

-- 2) دوال مساعدة (security definer لتفادي تكرار RLS)
create or replace function public.is_super_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from teacher_profiles where id = auth.uid()), false);
$$;

create or replace function public.can_see_all_students()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin', 'supervisor') from teacher_profiles where id = auth.uid()), false);
$$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'supervisor' from teacher_profiles where id = auth.uid()), false);
$$;

-- 3) رؤية التلاميذ: المُنشئ أو من يرى الجميع (المدير + المشرف المالي)
--    (سياسات الإضافة/التعديل/الحذف تبقى للمُنشئ أو المدير فقط عبر is_super_teacher)
drop policy if exists "students select own or super" on students;
create policy "students select own or super" on students
  for select using (auth.role() = 'authenticated' and (created_by = auth.uid() or public.can_see_all_students()));

-- 4) جدول الأداءات الشهرية (المبلغ حرّ)
create table if not exists payments (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  period text not null,                       -- الشهر بصيغة yyyy-mm
  amount double precision not null,
  paid_at date not null default current_date,
  recorded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, period)
);
create index if not exists payments_period_idx on payments(period);
create index if not exists payments_student_id_idx on payments(student_id);

alter table payments enable row level security;

-- القراءة متاحة للجميع (تقرير الأداءات مرئيّ لكل المستخدمين)
drop policy if exists "payments read all" on payments;
create policy "payments read all" on payments
  for select using (auth.role() = 'authenticated');

-- الكتابة للمشرف المالي فقط
drop policy if exists "payments insert supervisor" on payments;
create policy "payments insert supervisor" on payments
  for insert with check (auth.role() = 'authenticated' and public.is_supervisor());

drop policy if exists "payments update supervisor" on payments;
create policy "payments update supervisor" on payments
  for update using (auth.role() = 'authenticated' and public.is_supervisor())
  with check (auth.role() = 'authenticated' and public.is_supervisor());

-- 5) البثّ المباشر للأداءات
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'payments') then
    alter publication supabase_realtime add table payments;
  end if;
end $$;

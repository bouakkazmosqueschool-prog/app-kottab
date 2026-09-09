-- ============================================================
-- عزل التلاميذ حسب الأستاذ المنشئ + أستاذ مشرف يرى الجميع
--
-- القاعدة:
--   • كل أستاذ لا يرى إلا التلاميذ الذين أنشأهم بنفسه.
--   • الأستاذ المشرف «عبد الحق فضلي» يرى تلاميذ جميع الأساتذة.
--
-- طريقة الاستعمال (مرة واحدة على قاعدة البيانات الحالية):
--   Supabase Dashboard → SQL Editor → New query → الصق هذا الملف → Run
-- الملف قابل لإعادة التنفيذ بأمان (idempotent).
-- ============================================================

-- 1) علامة الإشراف على جدول الأساتذة
alter table teacher_profiles add column if not exists is_super boolean not null default false;
update teacher_profiles set is_super = true where name = 'عبد الحق فضلي';

-- 2) عمود المُنشئ على جدول التلاميذ (يُملأ تلقائياً بـ auth.uid() عند الإضافة)
alter table students add column if not exists created_by uuid references auth.users(id);
alter table students alter column created_by set default auth.uid();

-- 3) تعبئة التلاميذ الحاليين: نستنتج المُنشئ من اسم الأستاذ المسجَّل على أهداف الطالب.
--    (الإشارة الوحيدة المتاحة في البيانات؛ الطالب بلا أهداف يبقى بلا مالك فيراه المشرف فقط)
update students s
set created_by = tp.id
from goals g
join teacher_profiles tp on tp.name = g.teacher_name
where g.student_id = s.id
  and s.created_by is null
  and g.teacher_name is not null;

-- 4) دالة مساعدة: هل المستخدم الحالي أستاذ مشرف؟
--    security definer لتفادي أي تكرار (recursion) في سياسات RLS عند قراءة teacher_profiles.
create or replace function public.is_super_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_super from teacher_profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- 5) سياسات RLS على التلاميذ: المُنشئ أو المشرف فقط
-- ============================================================
drop policy if exists "authenticated all students" on students;
drop policy if exists "students select own or super" on students;
drop policy if exists "students insert own" on students;
drop policy if exists "students update own or super" on students;
drop policy if exists "students delete own or super" on students;

create policy "students select own or super" on students
  for select using (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  );

create policy "students insert own" on students
  for insert with check (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  );

create policy "students update own or super" on students
  for update using (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  ) with check (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  );

create policy "students delete own or super" on students
  for delete using (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  );

-- ============================================================
-- 6) الأهداف تتبع مالك الطالب (لا يرى الأستاذ إلا أهداف تلاميذه)
-- ============================================================
drop policy if exists "authenticated all goals" on goals;
drop policy if exists "goals by student owner or super" on goals;

create policy "goals by student owner or super" on goals
  for all using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s
      where s.id = goals.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  ) with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s
      where s.id = goals.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

-- ============================================================
-- 7) سجلّ الحفظ يتبع مالك الطالب كذلك
-- ============================================================
drop policy if exists "authenticated all memorization_records" on memorization_records;
drop policy if exists "memorization by student owner or super" on memorization_records;

create policy "memorization by student owner or super" on memorization_records
  for all using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s
      where s.id = memorization_records.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  ) with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s
      where s.id = memorization_records.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

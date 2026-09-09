-- ============================================================
-- عزل الأهداف حسب الأستاذ المُنشئ (نفس منطق التلاميذ)
--
-- القاعدة:
--   • كل أستاذ لا يرى إلا الأهداف (وتسجيل الإنجاز) التي أنشأها بنفسه.
--   • الأستاذ المشرف «عبد الحق فضلي» يرى أهداف جميع الأساتذة.
--
-- شرط مسبق: نفّذ supabase/add-student-ownership.sql أولاً
--   (يعتمد على العمود students.created_by وعلى الدالة is_super_teacher).
--
-- طريقة الاستعمال (مرة واحدة على قاعدة البيانات الحالية):
--   Supabase Dashboard → SQL Editor → New query → الصق هذا الملف → Run
-- الملف قابل لإعادة التنفيذ بأمان (idempotent).
-- ============================================================

-- 1) عمود المُنشئ على جدول الأهداف (يُملأ تلقائياً بـ auth.uid() عند الإضافة)
alter table goals add column if not exists created_by uuid references auth.users(id);
alter table goals alter column created_by set default auth.uid();

-- 2) تعبئة الأهداف الحالية: الهدف يخصّ نفس الأستاذ الذي يملك الطالب
update goals g
set created_by = s.created_by
from students s
where s.id = g.student_id and g.created_by is null and s.created_by is not null;

-- 3) احتياط: لأي هدف بقي بلا مالك، نستنتج من اسم الأستاذ المسجَّل على الهدف
update goals g
set created_by = tp.id
from teacher_profiles tp
where tp.name = g.teacher_name and g.created_by is null and g.teacher_name is not null;

-- 4) RLS: المُنشئ أو المشرف فقط (سياسة بسيطة متوافقة مع البثّ المباشر)
drop policy if exists "authenticated all goals" on goals;
drop policy if exists "goals by student owner or super" on goals;
drop policy if exists "goals own or super" on goals;
create policy "goals own or super" on goals
  for all using (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  ) with check (
    auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher())
  );

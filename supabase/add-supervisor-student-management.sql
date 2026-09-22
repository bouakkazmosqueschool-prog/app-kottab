-- ============================================================
-- السماح للمشرف المالي بإدارة التلاميذ (إضافة/تعديل/حذف)
--
-- المشرف المالي يضيف تلاميذ جدداً بلا أستاذ (created_by = null)، ثم يتولّى
-- المدير العام إسنادهم إلى أستاذ لاحقاً.
--
-- شرط مسبق: supabase/add-payments-and-roles.sql (الدوال is_supervisor / is_super_teacher).
-- الاستعمال: SQL Editor → Run. idempotent.
-- ============================================================

drop policy if exists "students insert own" on students;
create policy "students insert own" on students
  for insert with check (
    auth.role() = 'authenticated'
    and (created_by = auth.uid() or public.is_super_teacher() or public.is_supervisor())
  );

drop policy if exists "students update own or super" on students;
create policy "students update own or super" on students
  for update using (
    auth.role() = 'authenticated'
    and (created_by = auth.uid() or public.is_super_teacher() or public.is_supervisor())
  ) with check (
    auth.role() = 'authenticated'
    and (created_by = auth.uid() or public.is_super_teacher() or public.is_supervisor())
  );

drop policy if exists "students delete own or super" on students;
create policy "students delete own or super" on students
  for delete using (
    auth.role() = 'authenticated'
    and (created_by = auth.uid() or public.is_super_teacher() or public.is_supervisor())
  );

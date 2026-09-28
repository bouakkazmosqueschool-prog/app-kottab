-- ============================================================
-- التحقق من تفرّد اسم التلميذ عبر كل الأساتذة (قبل الإضافة/التعديل)
--
-- دالة security definer تتجاوز RLS لتبحث في كل التلاميذ (لا تلاميذ المستخدم فقط)
-- عن اسم مطابق (بعد تسوية المسافات وحالة الأحرف)، وتُرجع رقم التلميذ واسم أستاذه
-- إن وُجد. المقارنة تتجاهل المسافات الزائدة وحالة الأحرف.
--
-- لا يمسّ أي بيانات. idempotent. الاستعمال: SQL Editor → Run.
-- ============================================================
create or replace function public.check_student_name(p_name text, p_exclude_id text default null)
returns table (student_number int, teacher_name text)
language sql
stable
security definer
set search_path = public
as $$
  select s.student_number, tp.name
  from students s
  left join teacher_profiles tp on tp.id = s.created_by
  where lower(regexp_replace(btrim(s.full_name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'))
    and (p_exclude_id is null or s.id <> p_exclude_id)
  limit 1;
$$;

revoke all on function public.check_student_name(text, text) from public;
grant execute on function public.check_student_name(text, text) to authenticated;

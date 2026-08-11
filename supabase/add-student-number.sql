-- ============================================================
-- إضافة رقم تسلسلي ثابت لكل طالب (student_number)
-- لتنفيذ هذا فقط إن كانت قاعدة البيانات منشأة مسبقاً (قبل هذا التحديث)
-- طريقة الاستعمال: انسخ والصق في Supabase Dashboard → SQL Editor → Run
-- ============================================================

create sequence if not exists students_number_seq;

alter table students
  add column if not exists student_number integer default nextval('students_number_seq');

-- ترقيم الطلاب الحاليين حسب ترتيب تسجيلهم (created_at)، وليس عشوائياً
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from students
  where student_number is null
)
update students s
set student_number = numbered.rn
from numbered
where s.id = numbered.id;

-- تقديم التسلسل حتى لا يتكرر رقم عند إضافة طالب جديد لاحقاً
select setval('students_number_seq', (select coalesce(max(student_number), 0) from students));

-- تحقّق من النتيجة
select student_number, full_name from students order by student_number;

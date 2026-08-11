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
-- (نتجاوز هذه الخطوة إن كان الجدول فارغاً، فالتسلسل يبدأ من 1 افتراضياً)
do $$
declare
  max_num integer;
begin
  select coalesce(max(student_number), 0) into max_num from students;
  if max_num > 0 then
    perform setval('students_number_seq', max_num);
  end if;
end $$;

-- تحقّق من النتيجة
select student_number, full_name from students order by student_number;

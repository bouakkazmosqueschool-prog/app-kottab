-- ============================================================
-- الحضور والغياب: أيام حضور كل تلميذ + سجلّ الحضور اليومي
--
-- - عمود attendance_days على students: فهارس أيام الأسبوع (السبت=6 ... الخميس=4).
--   قائمة فارغة = كل أيام العمل (السبت→الخميس)، والجمعة عطلة دائماً.
-- - جدول attendance: حالة كل تلميذ في كل يوم (حاضر/غائب).
--
-- الصلاحيات:
--   • القراءة: أستاذ التلميذ + المدير العام + المشرف المالي (هذا الأخير للقراءة فقط).
--   • الكتابة: أستاذ التلميذ + المدير العام فقط (وليس المشرف المالي).
--
-- شرط مسبق: add-payments-and-roles.sql (الدوال) و add-student-ownership.sql (created_by).
-- الاستعمال: SQL Editor → Run. idempotent. لا يمسّ بيانات موجودة.
-- ============================================================

alter table students add column if not exists attendance_days int[] not null default '{}';

create table if not exists attendance (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent')),
  recorded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);
create index if not exists attendance_student_id_idx on attendance(student_id);
create index if not exists attendance_date_idx on attendance(date);

alter table attendance enable row level security;

-- القراءة: أستاذ التلميذ أو من يرى كل التلاميذ (المدير + المشرف المالي)
drop policy if exists "attendance read" on attendance;
create policy "attendance read" on attendance
  for select using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = attendance.student_id
        and (s.created_by = auth.uid() or public.can_see_all_students())
    )
  );

-- الكتابة (إضافة/تعديل/حذف): أستاذ التلميذ أو المدير العام فقط (وليس المشرف المالي)
drop policy if exists "attendance insert" on attendance;
create policy "attendance insert" on attendance
  for insert with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = attendance.student_id
        and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

drop policy if exists "attendance update" on attendance;
create policy "attendance update" on attendance
  for update using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = attendance.student_id
        and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  ) with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = attendance.student_id
        and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

drop policy if exists "attendance delete" on attendance;
create policy "attendance delete" on attendance
  for delete using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = attendance.student_id
        and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

-- البثّ المباشر
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'attendance') then
    alter publication supabase_realtime add table attendance;
  end if;
end $$;

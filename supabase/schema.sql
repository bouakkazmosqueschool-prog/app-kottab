-- ============================================================
-- مخطط قاعدة بيانات تطبيق كُتّاب
-- طريقة الاستعمال: انسخ هذا الملف كاملاً والصقه في
-- Supabase Dashboard → SQL Editor → New query → Run
-- الملف قابل لإعادة التنفيذ بأمان (idempotent) إن احتجت لتشغيله مرتين
-- ============================================================

-- جدول الملفات الشخصية للأساتذة (الاسم بالعربية مرتبط بحساب المصادقة)
create table if not exists teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  -- الأستاذ المشرف يرى تلاميذ جميع الأساتذة (عبد الحق فضلي)
  is_super boolean not null default false,
  created_at timestamptz not null default now()
);
alter table teacher_profiles add column if not exists is_super boolean not null default false;
update teacher_profiles set is_super = true where name = 'عبد الحق فضلي';

-- جدول التلاميذ
create table if not exists students (
  id text primary key,
  student_number serial,
  full_name text not null,
  level text not null,
  guardian_phone text,
  birth_date date,
  join_date date not null,
  notes text,
  active boolean not null default true,
  -- الأستاذ المُنشئ للطالب (أساس العزل بين الأساتذة) — يُملأ تلقائياً بـ auth.uid()
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table students add column if not exists created_by uuid references auth.users(id);
alter table students alter column created_by set default auth.uid();

-- جدول الأهداف (حفظ / مراجعة / الألواح)
-- ملاحظة: target_amount و achieved_amount من نوع double precision
-- (وليس numeric) حتى تُعاد كأرقام JS مباشرة، لا كنصوص
create table if not exists goals (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  type text not null check (type in ('hifz', 'murajaa', 'alwah', 'ijaza', 'tajwid')),
  unit text not null check (unit in ('aya', 'thumn', 'rub', 'nisf', 'hizb')),
  target_amount double precision not null,
  achieved_amount double precision,
  period_type text not null check (period_type in ('week', 'month', 'custom')),
  period_label text not null,
  start_date date not null,
  end_date date not null,
  teacher_name text,
  range_description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goals_student_id_idx on goals(student_id);
create index if not exists goals_type_idx on goals(type);

-- جدول سجل الحفظ (سورة/آيات/تاريخ) — للاستعمال المستقبلي (مخفي حالياً من الواجهة)
create table if not exists memorization_records (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  surah_id int not null,
  start_verse int not null,
  end_verse int not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists memorization_student_id_idx on memorization_records(student_id);

-- جدول إعدادات الكُتّاب (صف واحد ثابت فقط، id = 1)
create table if not exists app_settings (
  id int primary key default 1,
  school_name text not null default 'كُتّاب مسجد بوعكاز القديم',
  default_period_type text not null default 'month',
  constraint single_row check (id = 1)
);
insert into app_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- عزل التلاميذ حسب الأستاذ المُنشئ؛ والأستاذ المشرف يرى الجميع.
-- الأهداف وسجلّ الحفظ يتبعان مالك الطالب. إعدادات التطبيق مشتركة.
-- ============================================================
alter table teacher_profiles enable row level security;
alter table students enable row level security;
alter table goals enable row level security;
alter table memorization_records enable row level security;
alter table app_settings enable row level security;

-- دالة مساعدة: هل المستخدم الحالي أستاذ مشرف؟ (security definer لتفادي تكرار RLS)
create or replace function public.is_super_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_super from teacher_profiles where id = auth.uid()), false);
$$;

drop policy if exists "authenticated read teacher_profiles" on teacher_profiles;
create policy "authenticated read teacher_profiles" on teacher_profiles
  for select using (auth.role() = 'authenticated');

-- التلاميذ: المُنشئ أو المشرف فقط
drop policy if exists "authenticated all students" on students;
drop policy if exists "students select own or super" on students;
drop policy if exists "students insert own" on students;
drop policy if exists "students update own or super" on students;
drop policy if exists "students delete own or super" on students;
create policy "students select own or super" on students
  for select using (auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher()));
create policy "students insert own" on students
  for insert with check (auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher()));
create policy "students update own or super" on students
  for update using (auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher()))
  with check (auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher()));
create policy "students delete own or super" on students
  for delete using (auth.role() = 'authenticated' and (created_by = auth.uid() or public.is_super_teacher()));

-- الأهداف: تتبع مالك الطالب
drop policy if exists "authenticated all goals" on goals;
drop policy if exists "goals by student owner or super" on goals;
create policy "goals by student owner or super" on goals
  for all using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = goals.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  ) with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = goals.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

-- سجلّ الحفظ: يتبع مالك الطالب
drop policy if exists "authenticated all memorization_records" on memorization_records;
drop policy if exists "memorization by student owner or super" on memorization_records;
create policy "memorization by student owner or super" on memorization_records
  for all using (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = memorization_records.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  ) with check (
    auth.role() = 'authenticated' and exists (
      select 1 from students s where s.id = memorization_records.student_id and (s.created_by = auth.uid() or public.is_super_teacher())
    )
  );

-- الإعدادات مشتركة بين الجميع
drop policy if exists "authenticated all app_settings" on app_settings;
create policy "authenticated all app_settings" on app_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Realtime: تفعيل البث المباشر (لتحديث الواجهة فوراً بين الأجهزة)
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'students') then
    alter publication supabase_realtime add table students;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'goals') then
    alter publication supabase_realtime add table goals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'memorization_records') then
    alter publication supabase_realtime add table memorization_records;
  end if;
end $$;

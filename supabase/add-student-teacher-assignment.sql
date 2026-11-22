-- Run in the Supabase SQL Editor after installing the student and role policies.
-- RLS still controls which students each account can read, add, edit or delete.
begin;

create or replace function public.enforce_student_teacher_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'authenticated' or public.is_super_teacher() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Teachers create students under their own account. Supervisors can create
    -- unassigned students, or assign them if they pass the same check as UPDATE.
    if new.created_by is null
      or (new.created_by = auth.uid() and not public.is_supervisor()) then
      return new;
    end if;
  elsif new.created_by is not distinct from old.created_by then
    return new;
  end if;

  if not (
    public.is_supervisor() and exists (
      select 1 from auth.users
      where id = auth.uid() and lower(email) = 'ahmed.zemmouri@kottab.local'
    )
  ) then
    raise exception 'Student teacher assignment is forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teacher_profiles
    where id = new.created_by and role in ('teacher', 'super_admin')
  ) then
    raise exception 'Student assignment requires a valid teacher' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_student_teacher_assignment() from public, anon, authenticated;

drop trigger if exists enforce_student_teacher_assignment on public.students;
create trigger enforce_student_teacher_assignment
  before insert or update of created_by on public.students
  for each row execute function public.enforce_student_teacher_assignment();

commit;

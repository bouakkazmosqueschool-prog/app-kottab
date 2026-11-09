-- Run once in Supabase SQL Editor, after schema.sql.
-- Bearer links: only explicitly selected family-facing data is exposed.
create table if not exists public.student_public_links (
  student_id text primary key references public.students(id) on delete cascade,
  token uuid not null unique default gen_random_uuid()
);
alter table public.student_public_links enable row level security;
revoke all on public.student_public_links from anon, authenticated;

insert into public.student_public_links(student_id)
select id from public.students on conflict (student_id) do nothing;

create or replace function public.create_student_public_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.student_public_links(student_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_student_public_link() from public;
drop trigger if exists student_public_link_created on public.students;
create trigger student_public_link_created after insert on public.students
for each row execute function public.create_student_public_link();

-- Ownership is checked explicitly because this function bypasses RLS.
create or replace function public.manage_student_public_link(p_student_id text, p_regenerate boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_token uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.students s where s.id = p_student_id
      and (s.created_by = auth.uid() or public.can_see_all_students())
  ) then
    raise exception 'Student access denied' using errcode = '42501';
  end if;
  insert into public.student_public_links(student_id) values (p_student_id)
    on conflict (student_id) do nothing;
  if p_regenerate then
    update public.student_public_links set token = gen_random_uuid() where student_id = p_student_id;
  end if;
  select token into v_token from public.student_public_links where student_id = p_student_id;
  return v_token;
end;
$$;
revoke all on function public.manage_student_public_link(text, boolean) from public;
grant execute on function public.manage_student_public_link(text, boolean) to authenticated;

create or replace function public.get_public_student(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'fullName', s.full_name, 'teacherName', tp.name,
    'goals', coalesce((select jsonb_agg(jsonb_build_object(
      'id', g.id, 'type', g.type, 'unit', g.unit,
      'targetAmount', g.target_amount, 'achievedAmount', g.achieved_amount,
      'periodLabel', g.period_label, 'startDate', g.start_date, 'endDate', g.end_date,
      'rangeDescription', g.range_description
    ) order by g.start_date desc) from public.goals g where g.student_id = s.id), '[]'::jsonb),
    'memorization', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'surahId', m.surah_id, 'startVerse', m.start_verse,
      'endVerse', m.end_verse, 'date', m.date
    ) order by m.date desc) from public.memorization_records m where m.student_id = s.id), '[]'::jsonb),
    'attendance', coalesce((select jsonb_agg(jsonb_build_object(
      'date', a.date, 'status', a.status
    ) order by a.date desc) from public.attendance a where a.student_id = s.id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object(
      'period', p.period, 'amount', p.amount, 'paidAt', p.paid_at
    ) order by p.period desc) from public.payments p where p.student_id = s.id), '[]'::jsonb)
  ) from public.students s join public.student_public_links l on l.student_id = s.id
  left join public.teacher_profiles tp on tp.id = s.created_by
  where l.token = p_token;
$$;
revoke all on function public.get_public_student(uuid) from public;
grant execute on function public.get_public_student(uuid) to anon, authenticated;

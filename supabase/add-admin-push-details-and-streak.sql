-- Notification details and one alert per trailing series of at least 3 recorded absences.
-- Additive only: no existing student, attendance, payment or goal data is changed.
begin;
alter table public.admin_push_events add column if not exists student_id text;
alter table public.admin_push_events add column if not exists student_name text;
alter table public.admin_push_events add column if not exists teacher_name text;
alter table public.admin_push_events add column if not exists absence_count int;
-- Persistent deduplication survives the 7-day cleanup of notification diagnostics.
create table if not exists public.admin_push_absence_alerts (
  student_id text not null references public.students(id) on delete cascade,
  after_presence date not null,
  created_at timestamptz not null default now(),
  primary key(student_id, after_presence)
);
alter table public.admin_push_absence_alerts enable row level security;
revoke all on public.admin_push_absence_alerts from public, anon, authenticated;
grant all on public.admin_push_absence_alerts to service_role;

create or replace function public.queue_admin_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kind text;
  v_student_name text;
  v_teacher_name text;
  v_last_present date;
  v_streak_start date;
  v_absence_count int;
  v_inserted int;
begin
  if tg_table_name = 'attendance' then
    if new.status <> 'absent' then return new; end if;
    if tg_op = 'UPDATE' then
      if old.status = new.status and old.date = new.date and old.student_id = new.student_id then return new; end if;
    end if;
    v_kind := 'absence';
  elsif tg_table_name = 'payments' then
    if tg_op = 'UPDATE' then
      if old.amount = new.amount and old.period = new.period and old.paid_at = new.paid_at
        and old.student_id = new.student_id then return new; end if;
    end if;
    v_kind := 'payment';
  else
    return new;
  end if;
  -- No historical alerts when an administrator subscribes later.
  if not exists (select 1 from public.admin_push_subscriptions p
    join public.teacher_profiles t on t.id = p.user_id
    where t.role = 'super_admin' and t.name = 'عبد الحق فضلي') then return new; end if;

  if v_kind = 'absence' then
    if new.date > current_date then return new; end if;
    perform 1 from public.students where id = new.student_id for update;
    -- Consecutive recorded absences, regardless of weekends or unrecorded days.
    -- A present record interrupts the series. Backdated entries are evaluated
    -- against the current trailing series, never an already completed old one.
    select max(a.date) into v_last_present from public.attendance a
      where a.student_id = new.student_id and a.status = 'present' and a.date <= current_date;
    select count(*)::int, min(a.date) into v_absence_count, v_streak_start
      from public.attendance a
      where a.student_id = new.student_id and a.status = 'absent' and a.date <= current_date
        and (v_last_present is null or a.date > v_last_present);
    if v_absence_count < 3 or new.date < v_streak_start then return new; end if;
    insert into public.admin_push_absence_alerts(student_id, after_presence)
      values(new.student_id, coalesce(v_last_present, '-infinity'::date)) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then return new; end if;
  end if;

  select s.full_name, tp.name into v_student_name, v_teacher_name
    from public.students s left join public.teacher_profiles tp on tp.id = s.created_by
    where s.id = new.student_id;
  insert into public.admin_push_events(kind, student_id, student_name, teacher_name, absence_count)
    values(v_kind, new.student_id, v_student_name, v_teacher_name, v_absence_count);
  perform public.dispatch_admin_push();
  return new;
exception when others then
  raise warning 'Admin push enqueue unavailable';
  return new;
end;
$$;
revoke all on function public.queue_admin_push() from public, anon, authenticated;
commit;

-- Fix false duplicate suppression after a queued alert reached no registered device.
-- Only notification metadata changes; no student/attendance/payment/goal rows change.
begin;
alter table public.admin_push_absence_alerts add column if not exists event_id uuid references public.admin_push_events(id) on delete set null;
alter table public.admin_push_absence_alerts add column if not exists delivered_at timestamptz;
-- Bind legacy reservations to the event created in the same transaction.
update public.admin_push_absence_alerts r set event_id=(
  select e.id from public.admin_push_events e where e.student_id=r.student_id
    and e.kind='absence' and e.created_at=r.created_at order by e.id limit 1
) where r.event_id is null and r.delivered_at is null;
update public.admin_push_absence_alerts r set delivered_at=coalesce(e.finished_at,e.created_at)
  from public.admin_push_events e where e.id=r.event_id and r.delivered_at is null
    and exists(select 1 from public.admin_push_deliveries d where d.event_id=e.id);
-- Retain deduplication for genuinely old reservations whose diagnostics have expired.
update public.admin_push_absence_alerts set delivered_at=created_at
  where event_id is null and delivered_at is null and created_at<now()-interval '7 days';

-- Reservation is not delivery: an undelivered series may be queued again after
-- a device re-registers. A successfully sent series remains deduplicated.
create or replace function public.enqueue_student_absence_push(p_student_id text, p_changed_date date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_student_name text;
  v_teacher_name text;
  v_last_present date;
  v_streak_start date;
  v_absence_count int;
  v_event_id uuid;
  v_delivered_at timestamptz;
begin
  if p_changed_date > current_date then return null; end if;
  if not exists (select 1 from public.admin_push_subscriptions p
    join public.teacher_profiles t on t.id = p.user_id
    where t.role = 'super_admin' and t.name = 'عبد الحق فضلي') then return null; end if;
  perform 1 from public.students where id = p_student_id for update;
  select max(a.date) into v_last_present from public.attendance a
    where a.student_id = p_student_id and a.status = 'present' and a.date <= current_date;
  select count(*)::int, min(a.date) into v_absence_count, v_streak_start
    from public.attendance a where a.student_id = p_student_id and a.status = 'absent'
      and a.date <= current_date and (v_last_present is null or a.date > v_last_present);
  if v_absence_count < 3 or p_changed_date < v_streak_start then return null; end if;
  insert into public.admin_push_absence_alerts(student_id, after_presence)
    values(p_student_id, coalesce(v_last_present, '-infinity'::date)) on conflict do nothing;
  select r.event_id, r.delivered_at into v_event_id, v_delivered_at
    from public.admin_push_absence_alerts r where r.student_id = p_student_id
      and r.after_presence = coalesce(v_last_present, '-infinity'::date) for update;
  if v_delivered_at is not null then return null; end if;
  if exists (select 1 from public.admin_push_deliveries where event_id = v_event_id) then
    update public.admin_push_absence_alerts set delivered_at = now() where event_id = v_event_id;
    return null;
  end if;
  if exists (select 1 from public.admin_push_events e where e.id = v_event_id
    and e.finished_at is null and e.attempts < 5 and e.created_at > now() - interval '24 hours'
    and exists(select 1 from public.admin_push_subscriptions p join public.teacher_profiles t on t.id = p.user_id
      where t.role = 'super_admin' and t.name = 'عبد الحق فضلي' and p.created_at <= e.created_at)) then
    perform public.dispatch_admin_push();
    return null;
  end if;
  select s.full_name, tp.name into v_student_name, v_teacher_name
    from public.students s left join public.teacher_profiles tp on tp.id = s.created_by where s.id = p_student_id;
  insert into public.admin_push_events(kind, student_id, student_name, teacher_name, absence_count)
    values('absence', p_student_id, v_student_name, v_teacher_name, v_absence_count) returning id into v_event_id;
  update public.admin_push_absence_alerts set event_id = v_event_id
    where student_id = p_student_id and after_presence = coalesce(v_last_present, '-infinity'::date);
  perform public.dispatch_admin_push();
  return v_event_id;
end;
$$;
revoke all on function public.enqueue_student_absence_push(text, date) from public, anon, authenticated;
grant execute on function public.enqueue_student_absence_push(text, date) to service_role;

create or replace function public.queue_admin_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_student_name text; v_teacher_name text;
begin
  if tg_table_name = 'attendance' then
    if new.status <> 'absent' then return new; end if;
    if tg_op = 'UPDATE' then
      if old.status = new.status and old.date = new.date and old.student_id = new.student_id then return new; end if;
    end if;
    perform public.enqueue_student_absence_push(new.student_id, new.date);
    return new;
  elsif tg_table_name <> 'payments' then return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.amount = new.amount and old.period = new.period and old.paid_at = new.paid_at
      and old.student_id = new.student_id then return new; end if;
  end if;
  if not exists (select 1 from public.admin_push_subscriptions p join public.teacher_profiles t on t.id = p.user_id
    where t.role = 'super_admin' and t.name = 'عبد الحق فضلي') then return new; end if;
  select s.full_name, tp.name into v_student_name, v_teacher_name
    from public.students s left join public.teacher_profiles tp on tp.id = s.created_by
    where s.id = new.student_id;
  insert into public.admin_push_events(kind, student_id, student_name, teacher_name)
    values('payment', new.student_id, v_student_name, v_teacher_name);
  perform public.dispatch_admin_push();
  return new;
exception when others then
  raise warning 'Admin push enqueue unavailable';
  return new;
end;
$$;
revoke all on function public.queue_admin_push() from public, anon, authenticated;
commit;

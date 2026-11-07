-- Add student destinations to future notifications only. No business data changes.
begin;
alter table public.admin_push_events add column if not exists student_id text;

create or replace function public.queue_admin_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_kind text;
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
  insert into public.admin_push_events(kind, student_id) values(v_kind, new.student_id);
  perform public.dispatch_admin_push();
  return new;
exception when others then
  raise warning 'Admin push enqueue unavailable';
  return new;
end;
$$;
revoke all on function public.queue_admin_push() from public, anon, authenticated;
commit;

-- Execute after schema.sql. No existing business records are modified.
begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (octet_length(endpoint) <= 2048),
  keys jsonb not null,
  created_at timestamptz not null default now(),
  last_test_at timestamptz
);
create table if not exists public.admin_push_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('absence', 'payment')),
  student_id text,
  created_at timestamptz not null default now(),
  attempts int not null default 0,
  claimed_at timestamptz,
  finished_at timestamptz,
  last_error text
);
alter table public.admin_push_events add column if not exists student_id text;
create index if not exists admin_push_pending_idx on public.admin_push_events(created_at)
  where finished_at is null;
create table if not exists public.admin_push_deliveries (
  event_id uuid not null references public.admin_push_events(id) on delete cascade,
  subscription_id uuid not null references public.admin_push_subscriptions(id) on delete cascade,
  primary key(event_id, subscription_id)
);

-- Endpoints and encryption keys are only accessed by the Edge Function.
alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_events enable row level security;
alter table public.admin_push_deliveries enable row level security;
revoke all on public.admin_push_subscriptions, public.admin_push_events, public.admin_push_deliveries from public, anon, authenticated;
grant all on public.admin_push_subscriptions, public.admin_push_events, public.admin_push_deliveries to service_role;

-- Secrets are configured in Vault (see admin-push-setup.md).
create or replace function public.dispatch_admin_push()
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text; v_gateway_jwt text;
begin
  if not exists (select 1 from public.admin_push_events
    where finished_at is null and attempts < 5 and created_at > now() - interval '24 hours'
      and (claimed_at is null or claimed_at < now() - interval '2 minutes')) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'admin_push_url' limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'admin_push_secret' limit 1;
  select decrypted_secret into v_gateway_jwt from vault.decrypted_secrets where name = 'admin_push_gateway_jwt' limit 1;
  if v_url is null or v_secret is null or v_gateway_jwt is null then return; end if;
  perform net.http_post(url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret,
      'Authorization', 'Bearer ' || v_gateway_jwt),
    body := '{"action":"dispatch"}'::jsonb, timeout_milliseconds := 10000);
exception when others then
  -- A delivery outage must never prevent recording a payment or attendance.
  raise warning 'Admin push dispatch unavailable';
end;
$$;
revoke all on function public.dispatch_admin_push() from public, anon, authenticated;
grant execute on function public.dispatch_admin_push() to service_role;

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
drop trigger if exists admin_push_attendance on public.attendance;
create trigger admin_push_attendance after insert or update on public.attendance
  for each row execute function public.queue_admin_push();
drop trigger if exists admin_push_payments on public.payments;
create trigger admin_push_payments after insert or update on public.payments
  for each row execute function public.queue_admin_push();

-- Atomic lease prevents two concurrent webhook/cron invocations sending a batch twice.
create or replace function public.claim_admin_push_events()
returns setof public.admin_push_events language sql security definer set search_path = public as $$
  with batch as (
    select id from public.admin_push_events
    where finished_at is null and attempts < 5
      and created_at > now() - interval '24 hours'
      and (claimed_at is null or claimed_at < now() - interval '2 minutes')
    order by created_at limit 20 for update skip locked
  )
  update public.admin_push_events e set claimed_at = now(), attempts = attempts + 1
  from batch where e.id = batch.id returning e.*;
$$;
revoke all on function public.claim_admin_push_events() from public, anon, authenticated;
grant execute on function public.claim_admin_push_events() to service_role;

-- One retry per minute. A named job is updated rather than duplicated on rerun.
select cron.schedule('kottab-admin-push-retry', '* * * * *', 'select public.dispatch_admin_push()');
-- Retain delivery diagnostics for 7 days; no student information is stored here.
select cron.schedule('kottab-admin-push-cleanup', '20 3 * * *',
  $$delete from public.admin_push_events where created_at < now() - interval '7 days'$$);
commit;

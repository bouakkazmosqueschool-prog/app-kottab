-- Add WhatsApp overrides and extend contact access without rewriting student records.
begin;

set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter table public.students add column if not exists guardian_whatsapp text;

-- Existing phone and photo columns stay in place. Only ciphertext may be accessible
-- through the existing student API and Realtime feeds.
do $$
begin
  if exists (
    select 1 from public.students
    where (guardian_phone is not null and guardian_phone not like 'enc:v1:%')
       or (photo is not null and photo not like 'enc:v1:%')
  ) then
    raise exception 'Existing student contacts must already be encrypted';
  end if;
end;
$$;

create or replace function public.can_manage_student_contacts()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(auth.role() = 'authenticated' and (
    public.is_super_teacher() or (
      public.is_supervisor() and exists (
        select 1 from auth.users
        where id = auth.uid() and lower(email) = 'ahmed.zemmouri@kottab.local'
      )
    )
  ), false);
$$;

revoke all on function public.can_manage_student_contacts() from public, anon, authenticated;
grant execute on function public.can_manage_student_contacts() to authenticated;

create or replace function public.get_pii_key()
returns text
language sql stable security definer
set search_path = ''
as $$
  select case when public.can_manage_student_contacts() then (
    select decrypted_secret from vault.decrypted_secrets where name = 'pii_key' limit 1
  ) end;
$$;

revoke all on function public.get_pii_key() from public, anon, authenticated;
grant execute on function public.get_pii_key() to authenticated;

create table if not exists public.student_whatsapp_details (
  student_id text primary key references public.students(id) on delete cascade
    deferrable initially deferred,
  guardian_whatsapp text not null
);
alter table public.student_whatsapp_details enable row level security;
revoke all on public.student_whatsapp_details from public, anon, authenticated;
grant select on public.student_whatsapp_details to authenticated;

drop policy if exists "authorized read student whatsapp" on public.student_whatsapp_details;
create policy "authorized read student whatsapp" on public.student_whatsapp_details
  for select to authenticated using ((select public.can_manage_student_contacts()));

create or replace function public.enforce_student_contacts()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  phone_changed boolean;
  photo_changed boolean;
begin
  if tg_op = 'INSERT' then
    phone_changed := new.guardian_phone is not null;
    photo_changed := new.photo is not null;
  else
    phone_changed := new.guardian_phone is distinct from old.guardian_phone;
    photo_changed := new.photo is distinct from old.photo;
  end if;
  if not phone_changed and not photo_changed and new.guardian_whatsapp is null then
    return new;
  end if;
  if not public.can_manage_student_contacts() then
    raise exception 'Student contact update is forbidden' using errcode = '42501';
  end if;
  if (phone_changed and new.guardian_phone not like 'enc:v1:%')
    or (photo_changed and new.photo not like 'enc:v1:%')
    or (new.guardian_whatsapp <> '' and new.guardian_whatsapp not like 'enc:v1:%') then
    raise exception 'Student contact details must be encrypted' using errcode = '23514';
  end if;
  if new.guardian_whatsapp is null then
    return new;
  end if;

  if new.guardian_whatsapp = '' then
    delete from public.student_whatsapp_details where student_id = new.id;
  else
    insert into public.student_whatsapp_details (student_id, guardian_whatsapp)
    values (new.id, new.guardian_whatsapp)
    on conflict (student_id) do update set guardian_whatsapp = excluded.guardian_whatsapp;
  end if;
  new.guardian_whatsapp := null;
  return new;
end;
$$;

revoke all on function public.enforce_student_contacts() from public, anon, authenticated;
drop trigger if exists enforce_student_contacts on public.students;
create trigger enforce_student_contacts before insert or update of guardian_phone, photo, guardian_whatsapp on public.students
  for each row execute function public.enforce_student_contacts();

notify pgrst, 'reload schema';
commit;

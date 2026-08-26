-- Ajoute le type « حلقة الإجازة » à une base Supabase déjà initialisée.
-- Ce script peut être relancé sans risque dans le SQL Editor de Supabase.
alter table public.goals drop constraint if exists goals_type_check;

alter table public.goals
  add constraint goals_type_check
  check (type in ('hifz', 'murajaa', 'alwah', 'ijaza'));

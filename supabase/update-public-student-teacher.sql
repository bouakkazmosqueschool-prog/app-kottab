-- Replaces only the public read function. Existing records and links are unchanged.
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


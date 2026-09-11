-- ============================================================
-- السماح للمشرف المالي بحذف أداء (لتصحيح خطأ في الإدخال)
--
-- شرط مسبق: نفّذ supabase/add-payments-and-roles.sql أولاً.
-- الاستعمال: Supabase Dashboard → SQL Editor → Run. idempotent.
-- ============================================================
drop policy if exists "payments delete supervisor" on payments;
create policy "payments delete supervisor" on payments
  for delete using (auth.role() = 'authenticated' and public.is_supervisor());

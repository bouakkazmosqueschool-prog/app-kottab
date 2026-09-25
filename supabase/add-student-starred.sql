-- ============================================================
-- علامة "متميز" للطلبة المتميزين (star)
--
-- يضيف عموداً منطقياً starred على جدول التلاميذ (الافتراضي false).
-- لا يمسّ أي بيانات موجودة. الاستعمال: SQL Editor → Run. idempotent.
-- ============================================================
alter table students add column if not exists starred boolean not null default false;

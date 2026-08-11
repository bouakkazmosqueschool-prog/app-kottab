-- ============================================================
-- تفريغ بيانات التلاميذ والأهداف (والسجلات المرتبطة بها)
-- طريقة الاستعمال: انسخ والصق في Supabase Dashboard → SQL Editor → Run
--
-- لا يمسّ هذا الملف: حسابات الأساتذة (teacher_profiles) ولا إعدادات
-- الكُتّاب (app_settings) — فقط التلاميذ والأهداف وسجلّ الحفظ.
-- ============================================================

delete from memorization_records;
delete from goals;
delete from students;

-- (اختياري) تحقّق أن كل شيء فارغ فعلاً:
select
  (select count(*) from students) as عدد_التلاميذ,
  (select count(*) from goals) as عدد_الأهداف,
  (select count(*) from memorization_records) as عدد_سجلات_الحفظ;

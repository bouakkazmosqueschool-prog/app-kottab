// ============================================================
// سكريبت تعبئة قاعدة بيانات Supabase بالبيانات التجريبية
//
// شروط مسبقة: نفّذ schema.sql ثم seed-teachers.mjs أولاً
//
// طريقة التشغيل (من جهازك، مرة واحدة فقط):
//   cd kottab
//   npm install
//   npx tsx supabase/seed-data.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { generateSeedData } from '../src/data/seed';
import { TEACHER_ACCOUNTS } from '../src/data/teachers';
import type { Goal, MemorizationRecord, Student } from '../src/types';

const SUPABASE_URL = 'https://szypbjvhwaiblnqqevbw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O5uvHYwyDZUgG2crQtj1dQ_7VO0pzgx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function studentToRow(s: Student) {
  return {
    id: s.id,
    student_number: s.studentNumber,
    full_name: s.fullName,
    level: s.level,
    guardian_phone: s.guardianPhone ?? null,
    birth_date: s.birthDate ?? null,
    join_date: s.joinDate,
    notes: s.notes ?? null,
    active: s.active,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

function goalToRow(g: Goal) {
  return {
    id: g.id,
    student_id: g.studentId,
    type: g.type,
    unit: g.unit,
    target_amount: g.targetAmount,
    achieved_amount: g.achievedAmount,
    period_type: g.periodType,
    period_label: g.periodLabel,
    start_date: g.startDate,
    end_date: g.endDate,
    teacher_name: g.teacherName ?? null,
    range_description: g.rangeDescription ?? null,
    notes: g.notes ?? null,
    created_at: g.createdAt,
    updated_at: g.updatedAt,
  };
}

function memoToRow(m: MemorizationRecord) {
  return {
    id: m.id,
    student_id: m.studentId,
    surah_id: m.surahId,
    start_verse: m.startVerse,
    end_verse: m.endVerse,
    date: m.date,
    notes: m.notes ?? null,
    created_at: m.createdAt,
  };
}

async function main() {
  console.log('تسجيل الدخول للحصول على صلاحية الكتابة (RLS)...');
  const first = TEACHER_ACCOUNTS[0];
  const { error: authError } = await supabase.auth.signInWithPassword({ email: first.email, password: '1234' });
  if (authError) {
    console.error('✗ تعذر تسجيل الدخول. تأكد من تشغيل seed-teachers.mjs أولاً:', authError.message);
    process.exit(1);
  }

  const { students, goals, memorizationRecords } = generateSeedData();

  console.log(`إدخال ${students.length} تلميذاً...`);
  const { error: studentsError } = await supabase.from('students').upsert(students.map(studentToRow));
  if (studentsError) {
    console.error('✗ خطأ عند إدخال التلاميذ:', studentsError.message);
    process.exit(1);
  }

  console.log(`إدخال ${goals.length} هدفاً...`);
  const { error: goalsError } = await supabase.from('goals').upsert(goals.map(goalToRow));
  if (goalsError) {
    console.error('✗ خطأ عند إدخال الأهداف:', goalsError.message);
    process.exit(1);
  }

  console.log(`إدخال ${memorizationRecords.length} سجلّ حفظ...`);
  const { error: memoError } = await supabase.from('memorization_records').upsert(memorizationRecords.map(memoToRow));
  if (memoError) {
    console.error('✗ خطأ عند إدخال سجلات الحفظ:', memoError.message);
    process.exit(1);
  }

  await supabase.auth.signOut();
  console.log('\n✓ تمت التعبئة بنجاح.');
  process.exit(0);
}

main();

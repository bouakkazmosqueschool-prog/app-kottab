import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { canAssignStudentTeacher, canRecordPayments, canSeeAcademics } from '../src/data/teachers.ts';

test('Zemmouri can assign teachers with the financial supervisor interface', () => {
  const zemmouri = 'محمد الزموري';
  assert.equal(canAssignStudentTeacher(zemmouri), true);
  assert.equal(canRecordPayments(zemmouri), true);
  assert.equal(canSeeAcademics(zemmouri), false);
  assert.equal(canAssignStudentTeacher('عبد الحق فضلي'), true);
  assert.equal(canAssignStudentTeacher('أحمد بحلا'), false);
  assert.equal(canAssignStudentTeacher(), false);
});

test('PostgreSQL restricts assignment independently of the student update policies', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create publication supabase_realtime;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as
        'select current_setting(''request.jwt.claim.sub'', true)::uuid';
      create function auth.role() returns text language sql stable as
        'select current_setting(''request.jwt.claim.role'', true)';
      grant usage on schema auth to authenticated, anon;
    `);
    const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
    const migration = await readFile(new URL('../supabase/add-student-teacher-assignment.sql', import.meta.url), 'utf8');
    await db.exec(schema);
    await db.exec(migration);
    await db.exec(migration);
    const [zemmouri, supervisor, teacher, otherTeacher, admin] = Array.from(
      { length: 5 }, (_, index) => `00000000-0000-0000-0000-00000000000${index + 1}`,
    );
    await db.exec(`
      insert into auth.users values
        ('${zemmouri}', 'ahmed.zemmouri@kottab.local'), ('${supervisor}', 'other@kottab.local'),
        ('${teacher}', 'teacher@kottab.local'), ('${otherTeacher}', 'second@kottab.local'),
        ('${admin}', 'admin@kottab.local');
      insert into public.teacher_profiles (id, name, role) values
        ('${zemmouri}', 'Zemmouri', 'supervisor'), ('${supervisor}', 'Supervisor', 'supervisor'),
        ('${teacher}', 'Teacher', 'teacher'), ('${otherTeacher}', 'Second teacher', 'teacher'),
        ('${admin}', 'Admin', 'super_admin');
      grant select, insert, update, delete on public.students to authenticated, anon;
      grant usage on all sequences in schema public to authenticated, anon;
      set request.jwt.claim.role = 'authenticated';
      set role authenticated;
    `);
    const signIn = (id: string) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    const assign = (id: string | null) => db.query(
      "update public.students set created_by = $1 where id = 'student' returning created_by", [id],
    );
    const insert = (id: string, owner: string | null) => db.query(
      "insert into public.students (id, full_name, level, join_date, created_by) values ($1, 'Student', 'A', current_date, $2)",
      [id, owner],
    );

    await signIn(supervisor);
    await insert('student', null);
    await assert.rejects(assign(teacher), { code: '42501' });
    await assert.rejects(insert('preassigned', teacher), { code: '42501' });
    assert.equal((await db.exec("update public.students set notes = 'Updated' where id = 'student'"))[0].affectedRows, 1);

    await signIn(zemmouri);
    assert.deepEqual((await assign(teacher)).rows, [{ created_by: teacher }]);
    assert.deepEqual((await assign(otherTeacher)).rows, [{ created_by: otherTeacher }]);
    await assert.rejects(assign(supervisor), { code: '23514' });
    await assert.rejects(assign(null), { code: '23514' });

    await signIn(otherTeacher);
    await insert('own-student', otherTeacher);
    await assert.rejects(assign(teacher), { code: '42501' });
    assert.deepEqual((await assign(otherTeacher)).rows, [{ created_by: otherTeacher }]);

    await signIn(admin);
    assert.deepEqual((await assign(teacher)).rows, [{ created_by: teacher }]);

    await db.exec("set role anon; set request.jwt.claim.role = 'anon'");
    assert.deepEqual((await assign(otherTeacher)).rows, []);
  } finally {
    await db.close();
  }
});

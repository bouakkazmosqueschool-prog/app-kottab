import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { eventNotification, isPushAdmin, validSubscription } from '../supabase/functions/admin-push/domain.ts';

test('only the named administrator and real push services are accepted', () => {
  assert.equal(isPushAdmin({ name: 'عبد الحق فضلي', role: 'super_admin' }), true);
  assert.equal(isPushAdmin({ name: 'عبد الحق فضلي', role: 'teacher' }), false);
  assert.equal(isPushAdmin({ name: 'Autre administrateur', role: 'super_admin' }), false);
  assert.equal(isPushAdmin(null), false);
  const keys = { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) };
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/example', keys }), true);
  for (const endpoint of ['http://fcm.googleapis.com/send/x', 'https://127.0.0.1/push', 'https://fcm.googleapis.com.evil.test/x', 'https://fcm.googleapis.com:8080/x', 'https://user:password@fcm.googleapis.com/x']) {
    assert.equal(validSubscription({ endpoint, keys }), false, endpoint);
  }
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: {} }), false);
  assert.equal(eventNotification('absence', 'event').url, '/attendance');
  assert.equal(eventNotification('payment', 'event').url, '/payments-report');
  assert.equal(eventNotification('absence', 'event', 'stu_abc-123').url, '/students/stu_abc-123');
  assert.equal(eventNotification('payment', 'event', 'stu_abc-123').url, '/students/stu_abc-123');
  assert.equal(eventNotification('payment', 'event', '../outside').url, '/payments-report');
  const absence = eventNotification('absence', 'event', 'stu_abc', { studentName: 'أحمد', teacherName: 'أستاذ أحمد', absenceCount: 3 });
  assert.equal(absence.title, 'غياب — أحمد');
  assert.match(absence.body, /3 غيابات متتالية/);
  assert.match(absence.body, /الأستاذ: أستاذ أحمد/);
  const payment = eventNotification('payment', 'event', 'stu_abc', { studentName: 'أحمد', teacherName: 'أستاذ أحمد' });
  assert.equal(payment.title, 'أداء — أحمد');
  assert.match(payment.body, /الأستاذ: أستاذ أحمد/);
  assert.doesNotMatch(eventNotification('payment', 'event', 'stu_abc', { studentName: 'أحمد' }).body, /الأستاذ/);
});

test('database triggers isolate alerts, preserve records, avoid no-op alerts and lease atomically', async () => {
  const db = new PGlite();
  try {
    // Only hosted extensions are stubbed. Tables, triggers, RLS and leases run in PostgreSQL.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema vault; create schema net; create schema cron;
      create table auth.users(id uuid primary key);
      create table teacher_profiles(id uuid, name text, role text);
      create table students(id text primary key, full_name text, created_by uuid default '00000000-0000-0000-0000-000000000002');
      create table attendance(id text primary key, student_id text, status text, date date);
      create table payments(id text primary key, student_id text, amount float8, period text, paid_at date);
      create table vault.decrypted_secrets(name text, decrypted_secret text);
      create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
        returns bigint language sql as $$select 1::bigint$$;
      create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
      insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
      insert into teacher_profiles values
        ('00000000-0000-0000-0000-000000000001','عبد الحق فضلي','super_admin'),
        ('00000000-0000-0000-0000-000000000002','Other','teacher');
      insert into students(id,full_name) values('student','Existing student');
      insert into payments values('existing','student',100,'2026-10','2026-10-02');
    `);
    const migration = readFileSync(new URL('../supabase/add-admin-push.sql', import.meta.url), 'utf8')
      .replace(/^create extension .*;$/gm, '');
    await db.exec(migration);
    await db.exec(migration);
    // Upgrade an existing installation, including an old alert with no student ID.
    await db.exec('alter table admin_push_events drop column student_id');
    const upgrade = readFileSync(new URL('../supabase/add-push-student-links.sql', import.meta.url), 'utf8');
    await db.exec(upgrade);
    await db.exec(upgrade);
    const streakUpgrade = readFileSync(new URL('../supabase/add-admin-push-details-and-streak.sql', import.meta.url), 'utf8');
    await db.exec(streakUpgrade);
    await db.exec(streakUpgrade);
    const deliveryUpgrade = readFileSync(new URL('../supabase/fix-admin-push-undelivered-streak.sql', import.meta.url), 'utf8');
    await db.exec(deliveryUpgrade);
    await db.exec(deliveryUpgrade);
    const eachAbsenceUpgrade = readFileSync(new URL('../supabase/add-admin-push-each-absence.sql', import.meta.url), 'utf8');
    await db.exec(eachAbsenceUpgrade);
    await db.exec(eachAbsenceUpgrade);
    assert.deepEqual((await db.query('select * from payments')).rows, [{ id: 'existing', student_id: 'student', amount: 100, period: '2026-10', paid_at: new Date('2026-10-02') }]);
    const count = async () => Number((await db.query<{ n: number }>('select count(*)::int n from admin_push_events')).rows[0].n);
    await db.exec("insert into attendance values('a','student','absent','2026-11-01')");
    assert.equal(await count(), 0, 'no historical queue without subscriptions');
    await db.exec(`insert into admin_push_subscriptions(user_id,endpoint,keys) values
      ('00000000-0000-0000-0000-000000000002','https://fcm.googleapis.com/other','{}');
      insert into attendance values('b','student','absent','2026-11-02');`);
    assert.equal(await count(), 0, 'non-admin devices do not enable alerts');
    await db.exec(`insert into admin_push_subscriptions(user_id,endpoint,keys) values
      ('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/admin','{}');
      insert into attendance values('c','student','present','2026-11-03');`);
    assert.equal(await count(), 0, 'presence does not notify');
    await db.exec("update attendance set status='absent' where id='c'");
    assert.equal(await count(), 1);
    await db.exec("update attendance set status='absent' where id='c'");
    assert.equal(await count(), 1, 'saving an unchanged absence does not notify');
    await db.exec("update attendance set status='present' where id='c'");
    assert.equal(await count(), 1);
    await db.exec("insert into payments values('new','student',120,'2026-11','2026-11-06')");
    assert.equal(await count(), 2);
    await db.exec("update payments set amount=120 where id='new'");
    assert.equal(await count(), 2);
    await db.exec("update payments set amount=150 where id='new'");
    assert.equal(await count(), 3);
    assert.deepEqual((await db.query('select distinct kind,student_id from admin_push_events order by kind')).rows,
      [{ kind: 'absence', student_id: 'student' }, { kind: 'payment', student_id: 'student' }]);
    assert.deepEqual((await db.query("select student_name,teacher_name,absence_count from admin_push_events where kind='absence'")).rows,
      [{ student_name: 'Existing student', teacher_name: 'Other', absence_count: 3 }]);
    const permissions = await db.query<{ table_read: boolean; claim: boolean }>(`select
      has_table_privilege('authenticated','admin_push_subscriptions','SELECT') as table_read,
      has_function_privilege('anon','claim_admin_push_events()','EXECUTE') as claim`);
    assert.deepEqual(permissions.rows[0], { table_read: false, claim: false });
    await db.exec('set role service_role');
    assert.equal((await db.query('select * from claim_admin_push_events()')).rows.length, 3);
    assert.equal((await db.query('select * from claim_admin_push_events()')).rows.length, 0, 'concurrent dispatch cannot reclaim active leases');
    await db.exec("update admin_push_events set claimed_at = now() - interval '3 minutes'");
    assert.equal((await db.query('select * from claim_admin_push_events()')).rows.length, 3, 'expired leases can retry');
    await db.exec('update admin_push_events set attempts=5');
    assert.equal((await db.query('select * from claim_admin_push_events()')).rows.length, 0);
    await db.exec('reset role');

    // Notify on the third, fourth, fifth... recorded absence, reset by a presence.
    await db.exec("insert into students(id,full_name) values('second','Second student')");
    const alerts = async () => (await db.query<{ n: number }>("select count(*)::int n from admin_push_events where student_id='second' and kind='absence'")).rows[0].n;
    await db.exec("insert into attendance values('s0','second','present','2026-10-01')");
    await db.exec("insert into attendance values('s1','second','absent','2026-10-02')");
    assert.equal(await alerts(), 0, 'first absence is silent');
    await db.exec("insert into attendance values('s2','second','absent','2026-10-04')");
    assert.equal(await alerts(), 0, 'second absence is silent');
    await db.exec("insert into attendance values('s3','second','absent','2026-10-06')");
    assert.equal(await alerts(), 1, 'third absence alerts');
    await db.exec("insert into attendance values('s4','second','absent','2026-10-07')");
    assert.equal(await alerts(), 2, 'fourth absence alerts');
    await db.exec("update attendance set status='present' where id='s4'; update attendance set status='absent' where id='s4'");
    assert.equal(await alerts(), 2, 'restoring the same fourth absence does not duplicate it');
    await db.exec("insert into attendance values('backfill','second','absent','2026-10-03')");
    assert.equal(await alerts(), 3, 'fifth recorded absence alerts, even when entered out of date order');
    assert.deepEqual((await db.query("select absence_count from admin_push_events where student_id='second' order by absence_count")).rows,
      [{ absence_count: 3 }, { absence_count: 4 }, { absence_count: 5 }]);
    await db.exec("insert into attendance values('reset','second','present','2026-10-10')");
    await db.exec("insert into attendance values('r1','second','absent','2026-10-11'),('r2','second','absent','2026-10-12')");
    assert.equal(await alerts(), 3, 'presence resets the threshold');
    await db.exec("insert into attendance values('r3','second','absent','2026-10-13')");
    assert.equal(await alerts(), 4, 'third absence in a new series alerts again');
    await db.exec("insert into attendance values('historical','second','absent','2026-09-01')");
    await db.exec("insert into attendance values('future','second','absent',current_date+1)");
    assert.equal(await alerts(), 4, 'old and future entries do not notify');
    await db.exec("update admin_push_absence_steps set delivered_at=now() where student_id='second'; delete from admin_push_events where student_id='second'; insert into attendance values('r4','second','absent','2026-10-14')");
    assert.equal(await alerts(), 1, 'fourth absence alerts despite prior steps being delivered');
    await db.exec("update admin_push_absence_steps set delivered_at=now() where student_id='second'; delete from admin_push_events where student_id='second'");
    assert.equal((await db.query<{ queued: boolean }>("select enqueue_student_absence_push('second') is not null as queued")).rows[0].queued, false, 'cleanup does not duplicate a delivered fourth step');
    await db.exec("insert into attendance values('r5','second','absent','2026-10-15')");
    assert.equal(await alerts(), 1, 'fifth absence in the reset series alerts');
    await db.exec("update attendance set status='absent' where id='r5'");
    assert.equal(await alerts(), 1, 'saving an unchanged fifth absence does not alert again');

    await db.exec("insert into students(id,full_name,created_by) values('third','Third student',null)");
    await db.exec("insert into attendance values('t1','third','absent','2026-10-05'),('t3','third','absent','2026-10-09')");
    await db.exec("insert into attendance values('t2','third','absent','2026-10-07')");
    assert.deepEqual((await db.query("select student_name,teacher_name,absence_count from admin_push_events where student_id='third'")).rows,
      [{ student_name: 'Third student', teacher_name: null, absence_count: 3 }]);

    // Regression: a series reserved before a phone re-registers is not a delivery.
    await db.exec("insert into students(id,full_name) values('fourth','Unsent student'); insert into attendance values('u1','fourth','absent','2026-10-01'),('u2','fourth','absent','2026-10-02'),('u3','fourth','absent','2026-10-03')");
    const unsentAlerts = async () => (await db.query<{ n: number }>("select count(*)::int n from admin_push_events where student_id='fourth'")).rows[0].n;
    assert.equal(await unsentAlerts(), 1);
    await db.exec("update admin_push_events set finished_at=now() where student_id='fourth'");
    const attendanceBefore = (await db.query("select * from attendance where student_id='fourth' order by date")).rows;
    const recovery = await db.query<{ queued: boolean }>("select enqueue_student_absence_push('fourth') is not null as queued");
    assert.equal(recovery.rows[0].queued, true, 'unsent series can be replayed without touching attendance');
    assert.equal(await unsentAlerts(), 2);
    assert.deepEqual((await db.query("select * from attendance where student_id='fourth' order by date")).rows, attendanceBefore);
    assert.equal((await db.query<{ queued: boolean }>("select enqueue_student_absence_push('fourth') is not null as queued")).rows[0].queued, false, 'pending eligible event is not duplicated');
    await db.exec("update admin_push_events set finished_at=now() where student_id='fourth'; update admin_push_subscriptions set created_at=now()+interval '1 second' where user_id='00000000-0000-0000-0000-000000000001'");
    assert.equal((await db.query<{ queued: boolean }>("select enqueue_student_absence_push('fourth') is not null as queued")).rows[0].queued, true);
    await db.exec("update admin_push_absence_steps set delivered_at=now() where student_id='fourth'");
    assert.equal((await db.query<{ queued: boolean }>("select enqueue_student_absence_push('fourth') is not null as queued")).rows[0].queued, false, 'accepted delivery permanently deduplicates this step');
    const replayAccess = await db.query<{ allowed: boolean }>("select has_function_privilege('authenticated','enqueue_student_absence_push(text,date)','EXECUTE') as allowed");
    assert.equal(replayAccess.rows[0].allowed, false);
  } finally { await db.close(); }
});

test('service worker shows push in the background and restricts click navigation to local routes', async () => {
  const handlers: Record<string, (event: any) => void> = {};
  let shown: { title: string; options: any } | undefined;
  let navigated = '';
  const self = {
    location: { origin: 'https://school.example' },
    addEventListener: (name: string, callback: (event: any) => void) => { handlers[name] = callback; },
    registration: { showNotification: async (title: string, options: unknown) => { shown = { title, options }; } },
    clients: { matchAll: async () => [], openWindow: async (url: string) => { navigated = url; } },
  };
  runInNewContext(readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8'), { self, URL });
  let pending = Promise.resolve();
  handlers.push({ data: { json: () => ({ title: 'Alert', url: 'https://evil.example' }) }, waitUntil: (p: Promise<void>) => { pending = p; } });
  await pending;
  assert.equal(shown?.options.data.url, '/dashboard');
  handlers.push({ data: { json: () => { throw new Error('bad JSON'); } }, waitUntil: (p: Promise<void>) => { pending = p; } });
  await pending;
  assert.ok(shown?.title);
  handlers.notificationclick({ notification: { close() {}, data: { url: '//evil.example' } }, waitUntil: (p: Promise<void>) => { pending = p; } });
  await pending;
  assert.equal(navigated, 'https://school.example/dashboard');
  for (const kind of ['absence', 'payment']) {
    const payload = eventNotification(kind, 'event', 'stu_child-42');
    handlers.push({ data: { json: () => payload }, waitUntil: (p: Promise<void>) => { pending = p; } });
    await pending;
    assert.equal(shown?.options.data.url, '/students/stu_child-42');
    handlers.notificationclick({ notification: { close() {}, data: shown?.options.data }, waitUntil: (p: Promise<void>) => { pending = p; } });
    await pending;
    assert.equal(navigated, 'https://school.example/students/stu_child-42');
  }
  for (const url of ['/students/../login', '/students/%2e%2e', '/students/child?next=evil', '/students/child/extra', '/students/child\\evil']) {
    handlers.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: (p: Promise<void>) => { pending = p; } });
    await pending;
    assert.equal(navigated, 'https://school.example/dashboard');
  }
  let focused = false;
  self.clients.matchAll = async () => [{ url: 'https://school.example/dashboard', navigate: async (url: string) => { navigated = url; }, focus: async () => { focused = true; } }] as any;
  handlers.notificationclick({ notification: { close() {}, data: { url: '/students/stu_existing' } }, waitUntil: (p: Promise<void>) => { pending = p; } });
  await pending;
  assert.equal(navigated, 'https://school.example/students/stu_existing');
  assert.equal(focused, true);
});

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
      create table students(id text primary key, full_name text);
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
      insert into students values('student','Existing student');
      insert into payments values('existing','student',100,'2026-10','2026-10-02');
    `);
    const migration = readFileSync(new URL('../supabase/add-admin-push.sql', import.meta.url), 'utf8')
      .replace(/^create extension .*;$/gm, '');
    await db.exec(migration);
    await db.exec(migration);
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
});

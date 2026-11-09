import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { eventNotification, isPushAdmin, PUSH_DELIVERY_OPTIONS, validSubscription } from './domain.ts';

declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function vapid() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) throw new Error('Push is not configured');
  return { publicKey, privateKey, subject: Deno.env.get('VAPID_SUBJECT') || 'https://app-kottab-v2.bouakkaz-mosque-school.workers.dev' };
}

async function send(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: unknown) {
  if (!validSubscription(sub)) throw new Error('Invalid push endpoint');
  await webpush.sendNotification(sub, JSON.stringify(payload), { ...PUSH_DELIVERY_OPTIONS, vapidDetails: vapid() });
}

async function dispatch() {
  const { data: events, error } = await db.rpc('claim_admin_push_events');
  if (error) throw error;
  await Promise.all(((events ?? []) as {
    id: string; kind: string; student_id?: string | null; created_at: string;
    student_name?: string | null; teacher_name?: string | null; absence_count?: number | null;
  }[]).map(async (event) => {
    try {
      // Older queued absence alerts predate the three-absence rule.
      if (event.kind === 'absence' && (event.absence_count ?? 0) < 3) {
        const { error: skipped } = await db.from('admin_push_events')
          .update({ finished_at: new Date().toISOString(), last_error: null }).eq('id', event.id);
        if (skipped) throw skipped;
        return;
      }
      const { data: profiles, error: profileError } = await db.from('teacher_profiles').select('id, role, name').eq('role', 'super_admin');
      if (profileError) throw profileError;
      const adminIds = (profiles ?? []).filter(isPushAdmin).map((p) => p.id);
      const { data: subs, error: subError } = adminIds.length
        ? await db.from('admin_push_subscriptions').select('*').in('user_id', adminIds).lte('created_at', event.created_at)
        : { data: [], error: null };
      if (subError) throw subError;
      const { data: delivered, error: deliveryError } = await db.from('admin_push_deliveries').select('subscription_id').eq('event_id', event.id);
      if (deliveryError) throw deliveryError;
      const done = new Set((delivered ?? []).map((d) => d.subscription_id));
      let failed = false;
      // Bounded batch and ten-second requests stay within the two-minute lease.
      await Promise.all((subs ?? []).map(async (sub) => {
        if (done.has(sub.id)) return;
        try {
          await send(sub, eventNotification(event.kind, event.id, event.student_id, {
            studentName: event.student_name, teacherName: event.teacher_name, absenceCount: event.absence_count,
          }));
          const { error: saved } = await db.from('admin_push_deliveries').upsert({ event_id: event.id, subscription_id: sub.id });
          if (saved) failed = true;
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            const { error: removed } = await db.from('admin_push_subscriptions').delete().eq('id', sub.id);
            if (removed) failed = true;
          } else { failed = true; }
        }
      }));
      const { error: saved } = await db.from('admin_push_events').update(failed
        ? { last_error: 'Delivery failed; retry scheduled' }
        : { finished_at: new Date().toISOString(), last_error: null }).eq('id', event.id);
      if (saved) throw saved;
    } catch {
      // Leave the lease to expire. Never log subscriptions or private credentials.
      console.error('Admin push batch item failed');
    }
  }));
  return reply({ ok: true });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const body = await request.json();
    if (body.action === 'dispatch') {
      const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
      if (!secret || request.headers.get('x-push-secret') !== secret) return reply({ error: 'Unauthorized' }, 401);
      return await dispatch();
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return reply({ error: 'Unauthorized' }, 401);
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return reply({ error: 'Unauthorized' }, 401);
    const { data: profile, error: profileError } = await db.from('teacher_profiles').select('role, name').eq('id', user.id).single();
    if (profileError || !isPushAdmin(profile)) return reply({ error: 'Access denied' }, 403);

    if (body.action === 'status') {
      const { data: sub, error } = typeof body.endpoint === 'string'
        ? await db.from('admin_push_subscriptions').select('id').eq('user_id', user.id).eq('endpoint', body.endpoint).maybeSingle()
        : { data: null, error: null };
      if (error) throw error;
      return reply({ publicKey: vapid().publicKey, subscribed: !!sub });
    }
    if (body.action === 'subscribe') {
      if (!validSubscription(body.subscription)) return reply({ error: 'Invalid subscription' }, 400);
      const { endpoint, keys } = body.subscription;
      // This account is the only permitted recipient. Upsert preserves created_at.
      const { error } = await db.from('admin_push_subscriptions').upsert({ user_id: user.id, endpoint, keys }, { onConflict: 'endpoint' });
      if (error) throw error;
      return reply({ ok: true });
    }
    if (body.action === 'unsubscribe') {
      if (typeof body.endpoint !== 'string') return reply({ error: 'Invalid endpoint' }, 400);
      const { error } = await db.from('admin_push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);
      if (error) throw error;
      return reply({ ok: true });
    }
    if (body.action === 'test') {
      if (typeof body.endpoint !== 'string') return reply({ error: 'Invalid endpoint' }, 400);
      const delayed = body.delaySeconds === 20;
      if (body.delaySeconds !== undefined && body.delaySeconds !== 0 && !delayed) return reply({ error: 'Invalid test delay' }, 400);
      const now = new Date().toISOString();
      const cutoff = new Date(Date.now() - 60000).toISOString();
      const { data: subs, error } = await db.from('admin_push_subscriptions').update({ last_test_at: now })
        .eq('user_id', user.id).eq('endpoint', body.endpoint).or(`last_test_at.is.null,last_test_at.lt.${cutoff}`).select('*');
      if (error) throw error;
      if (!subs?.length) return reply({ error: 'انتظر دقيقة قبل إرسال اختبار آخر وتحقق من تفعيل الإشعارات.' }, 429);
      const deliverTest = async () => {
        // Respect a logout/unsubscribe or role change while the test is waiting.
        const { data: current, error: subError } = await db.from('admin_push_subscriptions').select('*')
          .eq('id', subs[0].id).eq('user_id', user.id).maybeSingle();
        if (subError) throw subError;
        if (!current) return;
        const { data: currentProfile, error: roleError } = await db.from('teacher_profiles')
          .select('role,name').eq('id', user.id).single();
        if (roleError) throw roleError;
        if (!isPushAdmin(currentProfile)) return;
        try {
          await send(current, {
            id: delayed ? 'kottab-background-test' : 'kottab-test',
            title: delayed ? 'اختبار الإشعارات في الخلفية' : 'إشعارات الكُتّاب مفعّلة',
            body: delayed ? 'هذا اختبار مؤجّل من الخادم، دون إنشاء غياب أو أداء.' : 'ستصلك هنا إشعارات الغياب والأداءات.',
            url: '/dashboard',
          });
          console.info(delayed ? 'Background push test accepted' : 'Push test accepted');
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.from('admin_push_subscriptions').delete().eq('id', current.id);
          throw error;
        }
      };
      if (delayed) {
        // The timer lives on the server: closing Chrome does not cancel it.
        EdgeRuntime.waitUntil(new Promise<void>((resolve) => setTimeout(resolve, 20000))
          .then(deliverTest).catch(() => { console.error('Background push test failed'); }));
        return reply({ ok: true, scheduled: true, delaySeconds: 20 });
      }
      await deliverTest();
      return reply({ ok: true });
    }
    return reply({ error: 'Unknown action' }, 400);
  } catch {
    return reply({ error: 'تعذّر تشغيل خدمة الإشعارات. يرجى التحقق من إعداد الخادم والمحاولة مجدداً.' }, 500);
  }
});

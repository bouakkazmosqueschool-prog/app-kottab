import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { PUSH_DELIVERY_OPTIONS } from './domain.ts';

Deno.test('encrypted Web Push requests ask the push service for immediate delivery', () => {
  // Generated disposable keys only; no real subscription or outbound request.
  const recipient = createECDH('prime256v1');
  recipient.generateKeys();
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    keys: { p256dh: recipient.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') },
  };
  const vapid = webpush.generateVAPIDKeys();
  const request = webpush.generateRequestDetails(subscription, JSON.stringify({ title: 'Test' }), {
    ...PUSH_DELIVERY_OPTIONS,
    vapidDetails: { ...vapid, subject: 'https://school.example' },
  });
  const headers = new Headers(request.headers);
  assert.equal(headers.get('urgency'), 'high');
  assert.equal(headers.get('ttl'), '3600');
  assert.equal(headers.get('content-encoding'), 'aes128gcm');
  assert.ok(request.body && request.body.length > 0);
});

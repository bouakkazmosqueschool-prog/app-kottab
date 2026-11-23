import assert from 'node:assert/strict';
import test from 'node:test';
import { parentWhatsAppLink, whatsAppNumber } from '../src/lib/whatsApp.ts';

test('formats Moroccan and international WhatsApp destinations', () => {
  for (const input of ['06 00 00 00 00', '+212 600-000-000', '00212600000000', '٠٦٠٠٠٠٠٠٠٠']) {
    assert.equal(whatsAppNumber(input), '212600000000');
  }
  assert.equal(whatsAppNumber('+33 6 00 00 00 00'), '33600000000');
  assert.equal(whatsAppNumber('06 abc 000000'), undefined);
  assert.equal(whatsAppNumber('0612'), undefined);
});

test('opens the intended recipient with the parent link in an Arabic draft', () => {
  const publicUrl = 'https://example.test/public-student/example';
  const href = parentWhatsAppLink('0700000000', publicUrl);
  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/212700000000');
  assert.equal(url.searchParams.get('text'), `السلام عليكم، يمكنكم متابعة تقدّم التلميذ عبر هذا الرابط: ${publicUrl}`);
  assert.equal(parentWhatsAppLink(undefined, publicUrl), undefined);
  assert.equal(parentWhatsAppLink('0700000000', ''), undefined);
});

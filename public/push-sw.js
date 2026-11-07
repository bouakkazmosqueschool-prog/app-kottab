// No offline cache: student data and bearer links must stay on the server.
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function notificationPath(value) {
  if (typeof value !== 'string') return '/dashboard';
  if (['/attendance', '/payments-report', '/dashboard'].includes(value)) return value;
  return /^\/students\/[A-Za-z0-9_-]+$/.test(value) ? value : '/dashboard';
}

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* Show a safe fallback. */ }
  const url = notificationPath(payload.url);
  event.waitUntil(self.registration.showNotification(payload.title || 'كُتّاب مسجد بوعكاز', {
    body: payload.body || 'يوجد تحديث جديد في الكُتّاب.',
    icon: '/logo.png',
    tag: payload.id || 'kottab-update',
    dir: 'rtl',
    lang: 'ar',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = notificationPath(event.notification.data?.url);
  const url = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});

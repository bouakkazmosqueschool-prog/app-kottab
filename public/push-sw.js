// No offline cache: student data and bearer links must stay on the server.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* Show a safe fallback. */ }
  const url = ['/attendance', '/payments-report', '/dashboard'].includes(payload.url) ? payload.url : '/dashboard';
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
  const allowed = ['/attendance', '/payments-report', '/dashboard'];
  const path = allowed.includes(event.notification.data?.url) ? event.notification.data.url : '/dashboard';
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

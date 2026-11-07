export const ADMIN_NAME = 'عبد الحق فضلي';

export function isPushAdmin(profile: { role?: string; name?: string } | null): boolean {
  return profile?.role === 'super_admin' && profile.name === ADMIN_NAME;
}

export function validSubscription(value: unknown): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!value || typeof value !== 'object') return false;
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof sub.endpoint !== 'string' || sub.endpoint.length > 2048) return false;
  try {
    const url = new URL(sub.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false;
    if (!['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname)) return false;
  } catch { return false; }
  return typeof sub.keys?.p256dh === 'string' && /^[A-Za-z0-9_-]{87}$/.test(sub.keys.p256dh)
    && typeof sub.keys.auth === 'string' && /^[A-Za-z0-9_-]{22}$/.test(sub.keys.auth);
}

export function eventNotification(kind: string, id: string, studentId?: string | null) {
  const profileUrl = studentId && /^[A-Za-z0-9_-]+$/.test(studentId) ? `/students/${studentId}` : null;
  if (kind === 'absence') return {
    id, title: 'تسجيل غياب', body: 'تم تسجيل غياب جديد. افتح التطبيق للاطلاع على التفاصيل.', url: profileUrl ?? '/attendance',
  };
  return {
    id, title: 'تحديث الأداءات', body: 'تم تسجيل أداء أو تعديله. افتح التطبيق للاطلاع على التفاصيل.', url: profileUrl ?? '/payments-report',
  };
}

export const ADMIN_NAME = 'عبد الحق فضلي';

// User-visible alerts should not wait for the browser to return to the foreground.
export const PUSH_DELIVERY_OPTIONS = { urgency: 'high' as const, TTL: 3600, timeout: 10000 };

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

export function eventNotification(kind: string, id: string, studentId?: string | null,
  details: { studentName?: string | null; teacherName?: string | null; absenceCount?: number | null } = {}) {
  const profileUrl = studentId && /^[A-Za-z0-9_-]+$/.test(studentId) ? `/students/${studentId}` : null;
  const name = details.studentName?.trim();
  const teacher = details.teacherName?.trim();
  const teacherLine = teacher ? `\nالأستاذ: ${teacher}` : '';
  if (kind === 'absence') return {
    id, title: name ? `غياب — ${name}` : 'غياب متكرر',
    body: `${details.absenceCount ?? 3} غيابات متتالية مسجّلة.${teacherLine}`, url: profileUrl ?? '/attendance',
  };
  return {
    id, title: name ? `أداء — ${name}` : 'تحديث الأداءات',
    body: `تم تسجيل أداء أو تعديله.${teacherLine}`, url: profileUrl ?? '/payments-report',
  };
}

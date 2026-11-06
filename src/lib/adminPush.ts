import { supabase } from './supabaseClient';

export function supportsAdminPush(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function pushRequest<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-push', { body: { action, ...extra }, timeout: 10000 });
  if (error || data?.error) throw new Error(data?.error || 'تعذّر الاتصال بخدمة الإشعارات. تحقق من إعداد الخدمة والاتصال بالإنترنت.');
  return data as T;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!supportsAdminPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function enableAdminPush(publicKey: string): Promise<PushSubscription> {
  if (await Notification.requestPermission() !== 'granted') throw new Error('لم يتم السماح بالإشعارات. يمكنك تفعيلها من إعدادات الموقع في المتصفح.');
  const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  if (subscription) {
    const previousKey = subscription.options.applicationServerKey;
    const oldBytes = previousKey ? new Uint8Array(previousKey) : null;
    if (!oldBytes || oldBytes.length !== bytes.length || oldBytes.some((v, i) => v !== bytes[i])) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await pushRequest('subscribe', { subscription: subscription.toJSON() });
  return subscription;
}

export async function disableAdminPush(): Promise<void> {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  // Unsubscribe locally even if the network fails (e.g. logout while offline).
  try { await pushRequest('unsubscribe', { endpoint: subscription.endpoint }); }
  finally { await subscription.unsubscribe(); }
}

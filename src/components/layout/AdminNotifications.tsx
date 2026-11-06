import { useEffect, useState } from 'react';
import { Bell, BellRing, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { currentPushSubscription, disableAdminPush, enableAdminPush, pushRequest, supportsAdminPush } from '../../lib/adminPush';

export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [message, setMessage] = useState('');
  const supported = supportsAdminPush();

  useEffect(() => {
    if (!open || !supported) return;
    let cancelled = false;
    setBusy(true);
    setMessage('');
    void (async () => {
      try {
        const subscription = await currentPushSubscription();
        const config = await pushRequest<{ publicKey: string; subscribed: boolean }>('status', { endpoint: subscription?.endpoint });
        if (!cancelled) { setPublicKey(config.publicKey); setActive(config.subscribed && Notification.permission === 'granted'); }
      } catch (error) { if (!cancelled) setMessage((error as Error).message); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [open, supported]);

  async function run(action: 'enable' | 'disable' | 'test') {
    setBusy(true);
    setMessage('');
    try {
      if (action === 'enable') {
        await enableAdminPush(publicKey);
        setActive(true);
        setMessage('تم تفعيل إشعارات الغياب والأداءات على هذا الجهاز.');
      } else if (action === 'disable') {
        await disableAdminPush();
        setActive(false);
        setMessage('تم إيقاف الإشعارات على هذا الجهاز.');
      } else {
        const subscription = await currentPushSubscription();
        if (!subscription) throw new Error('يرجى تفعيل الإشعارات أولاً.');
        await pushRequest('test', { endpoint: subscription.endpoint });
        setMessage('تم إرسال إشعار تجريبي. تحقق من إشعارات الهاتف.');
      }
    } catch (error) {
      if (action === 'disable' && !await currentPushSubscription()) setActive(false);
      setMessage((error as Error).message);
    }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="إشعارات المدير" title="إشعارات المدير"
      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-bordeaux hover:bg-bordeaux/8 transition-colors">
      {active ? <BellRing className="size-[18px]" /> : <Bell className="size-[18px]" />}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="إشعارات المدير" size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-bordeaux/5 p-4">
          <BellRing className="size-6 shrink-0 text-bordeaux" />
          <div><p className="font-semibold text-ink">عبد الحق فضلي</p><p className="text-sm text-ink-soft">إشعارات الغياب والأداءات فقط</p></div>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed">ستصلك تنبيهات عند تسجيل غياب أو تسجيل أداء أو تعديله، حتى عندما يكون التطبيق مغلقاً. اضغط على الإشعار لفتح التفاصيل.</p>
        <p className="flex items-center gap-2 text-xs text-ink-soft"><ShieldCheck className="size-4 shrink-0" /> لا تظهر أسماء الطلاب أو المبالغ على شاشة القفل.</p>
        {!supported ? <p className="text-sm text-clay">الإشعارات غير مدعومة في هذا المتصفح. افتح التطبيق في Chrome على هاتف Android عبر HTTPS.</p> : <>
          {Notification.permission === 'denied' && <p className="text-sm text-clay">الإشعارات محظورة لهذا الموقع. اسمح بها من إعدادات الموقع في Chrome ثم أعد فتح هذه النافذة.</p>}
          {active && <p className="flex items-center gap-2 text-sm text-teal"><CheckCircle2 className="size-4" /> الإشعارات مفعّلة على هذا الجهاز</p>}
          <div className="flex flex-wrap gap-2">
            {active ? <>
              <Button disabled={busy} onClick={() => void run('test')}>إرسال إشعار تجريبي</Button>
              <Button variant="ghost" disabled={busy} onClick={() => void run('disable')}>إيقاف على هذا الجهاز</Button>
            </> : <Button disabled={busy || !publicKey || Notification.permission === 'denied'} onClick={() => void run('enable')}>{busy ? 'جارٍ التحميل…' : 'تفعيل الإشعارات على هذا الجهاز'}</Button>}
          </div>
        </>}
        <p role="status" aria-live="polite" className="text-sm text-ink-soft">{message}</p>
      </div>
    </Modal>
  </>;
}

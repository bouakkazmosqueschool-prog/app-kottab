import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button, Card } from '../ui/Primitives';
import { Modal } from '../ui/Modal';

export function StudentPublicLink({ studentId }: { studentId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setToken(null);
    setBusy(true);
    setMessage('');
    setConfirm(false);
    void Promise.resolve(supabase.rpc('manage_student_public_link', { p_student_id: studentId })).then(({ data, error }) => {
      if (!active) return;
      setToken(error ? null : data);
      setMessage(error ? 'تعذّر تحميل الرابط. يرجى إعادة المحاولة.' : '');
      setBusy(false);
    }).catch(() => {
      if (!active) return;
      setMessage('تعذّر تحميل الرابط. يرجى إعادة المحاولة.');
      setBusy(false);
    });
    return () => { active = false; };
  }, [studentId]);

  async function regenerate() {
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.rpc('manage_student_public_link', {
        p_student_id: studentId, p_regenerate: true,
      });
      if (error) throw error;
      setToken(data);
      setCopied(false);
      setConfirm(false);
      setMessage('تم إنشاء رابط جديد وإلغاء الرابط السابق.');
    } catch {
      setMessage('تعذّر إنشاء الرابط. يرجى إعادة المحاولة.');
    } finally {
      setBusy(false);
    }
  }

  const url = token ? `${window.location.origin}/public-student/${token}` : '';
  return <><Card className="overflow-hidden">
    <div className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bordeaux/8 text-bordeaux">
          <Link2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-display text-lg font-bold text-ink">رابط متابعة وليّ الأمر</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[11px] font-semibold text-teal">
              <ShieldCheck className="size-3" aria-hidden="true" /> للقراءة فقط
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">شارك الرابط مع وليّ الأمر لمتابعة الطالب دون تسجيل الدخول.</p>
        </div>
      </div>

      {url ? <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-line bg-cream/60 p-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Link2 className="size-4 shrink-0 text-ink-soft/60" aria-hidden="true" />
          <input aria-label="رابط متابعة وليّ الأمر" dir="ltr" readOnly value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full min-w-0 bg-transparent py-2 font-mono text-xs text-ink-soft outline-none" />
        </div>
        <Button className="shrink-0" size="sm" disabled={busy} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />} onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setMessage('تم نسخ الرابط.'); }
          catch { setCopied(false); setMessage('تعذّر النسخ. يمكنك نسخ الرابط يدوياً.'); }
        }}>{copied ? 'تم النسخ' : 'نسخ الرابط'}</Button>
      </div> : busy && <div className="h-12 rounded-xl bg-cream animate-pulse" aria-label="جارٍ تحميل الرابط" />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">احتفظ بخصوصية الرابط وشاركه مع وليّ الأمر فقط.</p>
        <div className="flex flex-wrap items-center gap-2">
          {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-bordeaux hover:bg-bordeaux/5">
            <ExternalLink className="size-3.5" aria-hidden="true" /> فتح صفحة المتابعة
          </a>}
          <Button variant="ghost" size="sm" disabled={busy || confirm} icon={<RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />} onClick={() => { setMessage(''); setConfirm(true); }}>
            {busy ? 'جارٍ التحميل…' : 'تجديد الرابط'}
          </Button>
        </div>
      </div>

      <div role="status" aria-live="polite" className={message ? 'text-xs text-ink-soft' : 'sr-only'}>{message}</div>
    </div>
  </Card>
    <Modal open={confirm} onClose={() => { if (!busy) setConfirm(false); }} title="تجديد رابط المتابعة؟" size="sm"
      footer={<>
        <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>إلغاء</Button>
        <Button variant="danger" disabled={busy} onClick={() => void regenerate()}>
          {busy ? 'جارٍ التجديد…' : 'تأكيد التجديد'}
        </Button>
      </>}>
      <div className="flex items-start gap-3">
        <TriangleAlert className="size-5 shrink-0 mt-0.5 text-clay" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-ink-soft">سيتوقف الرابط السابق عن العمل فوراً. أرسل الرابط الجديد إلى وليّ الأمر بعد التجديد.</p>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-clay">{message}</p>}
    </Modal>
  </>;
}

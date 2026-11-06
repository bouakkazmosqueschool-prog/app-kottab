import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Button, Card } from '../ui/Primitives';

export function StudentPublicLink({ studentId }: { studentId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);

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
      setConfirm(false);
      setMessage('تم إنشاء رابط جديد وإلغاء الرابط السابق.');
    } catch {
      setMessage('تعذّر إنشاء الرابط. يرجى إعادة المحاولة.');
    } finally {
      setBusy(false);
    }
  }

  const url = token ? `${window.location.origin}/public-student/${token}` : '';
  return <Card className="p-5 flex flex-col gap-3">
    <h3 className="font-display font-bold text-ink">رابط متابعة وليّ الأمر</h3>
    <p className="text-sm text-ink-soft">يتيح هذا الرابط متابعة الطالب دون تسجيل الدخول. شاركه مع وليّ الأمر فقط. إنشاء رابط جديد يُلغي الرابط السابق فوراً.</p>
    {url && <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="text-sm text-bordeaux underline break-all">{url}</a>}
    <div className="flex flex-wrap gap-2">
      {url && <Button variant="secondary" disabled={busy} onClick={async () => {
        try { await navigator.clipboard.writeText(url); setMessage('تم نسخ الرابط.'); }
        catch { setMessage('تعذّر النسخ. يمكنك نسخ الرابط يدوياً.'); }
      }}>نسخ الرابط</Button>}
      <Button variant="secondary" disabled={busy} onClick={() => setConfirm(true)}>{busy ? 'جارٍ التحميل…' : 'إنشاء رابط جديد'}</Button>
    </div>
    {confirm && <div className="flex flex-wrap items-center gap-3 text-sm">
      <p>سيُلغى الرابط السابق. هل تريد المتابعة؟</p>
      <Button variant="danger" disabled={busy} onClick={() => void regenerate()}>تأكيد إنشاء رابط جديد</Button>
      <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>إلغاء</Button>
    </div>}
    <p role="status" className="text-sm text-ink-soft">{message}</p>
  </Card>;
}

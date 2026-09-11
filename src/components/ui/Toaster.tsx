import { CheckCircle2, XCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { useToastStore } from '../../store/toastStore';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            'pointer-events-auto w-full flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-[var(--shadow-pop)] text-sm font-semibold text-cream motion-safe:animate-[slideInStart_200ms_ease-out]',
            t.type === 'success' ? 'bg-teal' : 'bg-clay',
          )}
        >
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1 min-w-0">{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="إغلاق" className="shrink-0 text-cream/80 hover:text-cream">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Repeat, PenLine, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { Halqa } from '../../types';
import { HALQA_LABELS } from '../../lib/constants';
import { useAuthStore } from '../../store/authStore';

const HALQA_ICONS: Record<Halqa, typeof BookOpen> = {
  hifz: BookOpen,
  murajaa: Repeat,
  alwah: PenLine,
};

const HALQAS: Halqa[] = ['hifz', 'murajaa', 'alwah'];

export function HalqaSwitcher() {
  const session = useAuthStore((s) => s.session);
  const switchHalqa = useAuthStore((s) => s.switchHalqa);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!session) return null;
  const Icon = HALQA_ICONS[session.halqa];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-bordeaux text-cream rounded-xl px-3.5 py-2 hover:bg-bordeaux-dark transition-colors"
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={2.25} />
        <span className="text-sm font-bold whitespace-nowrap">{HALQA_LABELS[session.halqa]}</span>
        <ChevronDown className={clsx('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-64 left-1/2 -translate-x-1/2 bg-paper rounded-xl border border-line shadow-[var(--shadow-pop)] p-2">
          {HALQAS.map((h) => {
            const HIcon = HALQA_ICONS[h];
            const active = h === session.halqa;
            return (
              <button
                key={h}
                type="button"
                onClick={() => {
                  switchHalqa(h);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-start transition-colors',
                  active ? 'bg-bordeaux text-cream font-bold' : 'text-ink hover:bg-ink/5',
                )}
              >
                <HIcon className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                {HALQA_LABELS[h]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

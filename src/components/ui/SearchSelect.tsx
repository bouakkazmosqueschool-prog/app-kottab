import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import clsx from 'clsx';

export interface SearchSelectOption {
  value: string;
  label: string;
}

/**
 * قائمة اختيار مفردة مع بحث قابل للكتابة. تحلّ محلّ <select> العادية
 * حين تكون القائمة طويلة (مثل قائمة التلاميذ) ليُمكن البحث بالاسم.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  disabled = false,
  className,
}: {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm transition-colors focus:border-bordeaux focus:outline-none hover:border-ink/25 disabled:bg-ink/5 disabled:text-ink-soft/70 disabled:hover:border-line"
      >
        <span className={clsx('flex-1 text-start truncate', !selected && 'text-ink-soft')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={clsx('w-3.5 h-3.5 shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full bg-paper rounded-xl border border-line shadow-[var(--shadow-pop)] p-1.5">
          <div className="relative mb-1.5">
            <Search className="w-4 h-4 text-ink-soft absolute top-1/2 -translate-y-1/2 start-2.5 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full rounded-lg border border-line bg-paper ps-8 pe-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-bordeaux focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto flex flex-col">
            {visibleOptions.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-ink-soft text-center">لا توجد نتائج</p>
            ) : (
              visibleOptions.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-start transition-colors',
                      active ? 'bg-bordeaux/8 text-ink font-semibold' : 'text-ink hover:bg-ink/5',
                    )}
                  >
                    <Check className={clsx('w-3.5 h-3.5 shrink-0', active ? 'text-bordeaux' : 'text-transparent')} strokeWidth={3} />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

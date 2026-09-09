import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * قائمة اختيار متعدد بنمط منسدل (checkboxes). دلالة الاختيار الفارغ = «الكل»
 * (لا فلترة)، لذلك لا حاجة لخيار «الكل» صريح. تدعم البحث للقوائم الطويلة.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  searchable = false,
  className,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** يظهر حين لا يوجد أي اختيار (يعني: الكل) */
  placeholder: string;
  searchable?: boolean;
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

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  function toggle(value: string) {
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? placeholder)
        : `${selected.length} مختارة`;

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm transition-colors focus:border-bordeaux focus:outline-none hover:border-ink/25"
      >
        <span className={clsx('flex-1 text-start truncate', selected.length === 0 && 'text-ink-soft')}>{triggerLabel}</span>
        {selected.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label="مسح الاختيار"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange([]);
              }
            }}
            className="shrink-0 text-ink-soft hover:text-clay transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={clsx('w-3.5 h-3.5 shrink-0 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full bg-paper rounded-xl border border-line shadow-[var(--shadow-pop)] p-1.5">
          {searchable && (
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
          )}
          <div className="max-h-64 overflow-y-auto flex flex-col">
            {visibleOptions.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-ink-soft text-center">لا توجد نتائج</p>
            ) : (
              visibleOptions.map((o) => {
                const checked = selectedSet.has(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-start transition-colors',
                      checked ? 'bg-bordeaux/8 text-ink font-semibold' : 'text-ink hover:bg-ink/5',
                    )}
                  >
                    <span
                      className={clsx(
                        'w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors',
                        checked ? 'bg-bordeaux border-bordeaux text-cream' : 'border-line',
                      )}
                    >
                      {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
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

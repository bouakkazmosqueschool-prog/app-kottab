import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { MONTHS_MA, toISODate, parseISODate, todayISO, formatShortDate } from '../../lib/dates';

const WEEKDAYS_SHORT = ['سبت', 'أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع'];

interface DatePickerProps {
  value: string; // ISO yyyy-mm-dd، أو فارغ
  onChange: (isoValue: string) => void;
  placeholder?: string;
  className?: string;
}

/** يبني شبكة أيام الشهر (مع أيام الشهرين المجاورين خارج النطاق)، تبدأ يوم السبت */
function buildMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 1) % 7; // 0 = السبت
  const gridStart = new Date(year, month, 1 - startOffset);
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === month });
  }
  return days;
}

export function ArabicDatePicker({ value, onChange, placeholder, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const base = value ? parseISODate(value) : parseISODate(todayISO());
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const b = value ? parseISODate(value) : parseISODate(todayISO());
    setViewYear(b.getFullYear());
    setViewMonth(b.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(d: Date) {
    onChange(toISODate(d));
    setOpen(false);
  }

  const grid = buildMonthGrid(viewYear, viewMonth);
  const selectedISO = value || '';

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-start transition-colors focus:border-bordeaux focus:outline-none',
          value ? 'text-ink' : 'text-ink-soft/50',
        )}
      >
        <span className="tabular-nums">{value ? formatShortDate(value) : placeholder || 'اختر تاريخاً'}</span>
        <Calendar className="w-4 h-4 text-ink-soft shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 bg-paper rounded-xl border border-line shadow-[var(--shadow-pop)] p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="الشهر التالي"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-display font-bold text-ink text-sm">
              {MONTHS_MA[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="الشهر السابق"
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold text-ink-soft py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map(({ date, inMonth }) => {
              const iso = toISODate(date);
              const isSelected = iso === selectedISO;
              const isToday = iso === todayISO();
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(date)}
                  className={clsx(
                    'h-8 rounded-lg text-xs tabular-nums transition-colors',
                    isSelected
                      ? 'bg-bordeaux text-cream font-bold'
                      : inMonth
                        ? 'text-ink hover:bg-bordeaux/8'
                        : 'text-ink-soft/40 hover:bg-ink/5',
                    !isSelected && isToday && 'ring-1 ring-gold',
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

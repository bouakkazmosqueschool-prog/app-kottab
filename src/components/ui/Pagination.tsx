import { ChevronRight, ChevronLeft } from 'lucide-react';
import { IconButton } from './Primitives';

export function Pagination({
  page,
  totalPages,
  onChange,
  total,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total?: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 flex-wrap">
      {typeof total === 'number' && <p className="text-xs text-ink-soft">{total} نتيجة</p>}
      <div className="flex items-center gap-1 mr-auto">
        <IconButton label="السابق" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {/* في الاتجاه RTL: "السابق" يذهب نحو اليمين بصرياً */}
          <ChevronRight className="w-4 h-4" />
        </IconButton>
        <span dir="ltr" className="text-xs text-ink-soft px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <IconButton label="التالي" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronLeft className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
}

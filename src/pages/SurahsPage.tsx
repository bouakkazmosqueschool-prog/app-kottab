import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SURAHS } from '../data/surahs';
import { useMemorizationStore } from '../store/memorizationStore';
import { useStudentsStore } from '../store/studentsStore';
import { formatShortDate } from '../lib/dates';
import type { Surah } from '../types';
import { SectionHeader, Card } from '../components/ui/Primitives';
import { TextInput } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export default function SurahsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Surah | null>(null);
  const records = useMemorizationStore((s) => s.records);
  const students = useStudentsStore((s) => s.students);
  const studentsById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter((s) => s.name.includes(search.trim()) || s.transliteration.toLowerCase().includes(q) || String(s.id) === q);
  }, [search]);

  const selectedRecords = useMemo(
    () => (selected ? records.filter((r) => r.surahId === selected.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [selected, records],
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="السور" subtitle="114 سورة من القرآن الكريم" />

      <div className="relative sm:w-80">
        <Search className="w-4 h-4 text-ink-soft absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
        <TextInput placeholder="ابحث برقم أو اسم السورة..." value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState title="لا نتائج" />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((s) => {
            const count = records.filter((r) => r.surahId === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="text-start bg-paper rounded-xl border border-line p-3.5 hover:border-bordeaux/40 hover:shadow-[var(--shadow-card)] transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-gold/20 text-bordeaux-dark text-[11px] font-bold flex items-center justify-center shrink-0">
                    {s.id}
                  </span>
                  <span className="text-[10px] text-ink-soft">{s.revelation === 'meccan' ? 'مكية' : 'مدنية'}</span>
                </div>
                <p className="font-display font-bold text-ink truncate">{s.name}</p>
                <p className="text-[11px] text-ink-soft truncate">{s.transliteration}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-ink-soft">{s.versesCount} آية</span>
                  {count > 0 && <span className="text-[11px] font-semibold text-teal">{count} حفظ</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.id}. ${selected.name}` : ''}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 text-sm text-ink-soft">
              <span>{selected.transliteration}</span>
              <span>{selected.versesCount} آية</span>
              <span>{selected.revelation === 'meccan' ? 'مكية' : 'مدنية'}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-soft mb-2">الطلاب الذين حفظوها ({selectedRecords.length})</p>
              {selectedRecords.length === 0 ? (
                <p className="text-sm text-ink-soft">لم يقم أي طالب بحفظ هذه السورة بعد.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {selectedRecords.map((r) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{studentsById.get(r.studentId)?.fullName ?? '—'}</span>
                      <span className="text-xs text-ink-soft">
                        الآيات {r.startVerse}–{r.endVerse}
                      </span>
                      <span className="text-xs text-ink-soft">{formatShortDate(r.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

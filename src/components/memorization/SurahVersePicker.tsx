import { SURAHS, getSurahById } from '../../data/surahs';
import { FormField, Select, NumberInput } from '../ui/Field';

interface Props {
  surahId: number;
  startVerse: number;
  endVerse: number;
  onChange: (patch: Partial<{ surahId: number; startVerse: number; endVerse: number }>) => void;
  error?: string;
}

export function SurahVersePicker({ surahId, startVerse, endVerse, onChange, error }: Props) {
  const surah = getSurahById(surahId);

  return (
    <div className="flex flex-col gap-4">
      <FormField label="السورة" required>
        <Select
          value={surahId}
          onChange={(e) => {
            const id = Number(e.target.value);
            const s = getSurahById(id);
            onChange({ surahId: id, startVerse: 1, endVerse: s?.versesCount ?? 1 });
          }}
        >
          {SURAHS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}. {s.name}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="من الآية" required error={error}>
          <NumberInput
            min={1}
            max={surah?.versesCount ?? 1}
            value={startVerse}
            onChange={(e) => onChange({ startVerse: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="إلى الآية" required>
          <NumberInput
            min={1}
            max={surah?.versesCount ?? 1}
            value={endVerse}
            onChange={(e) => onChange({ endVerse: Number(e.target.value) })}
          />
        </FormField>
      </div>

      <button
        type="button"
        onClick={() => onChange({ startVerse: 1, endVerse: surah?.versesCount ?? 1 })}
        className="text-xs font-semibold text-bordeaux w-fit hover:underline"
      >
        السورة كاملة ({surah?.versesCount} آية)
      </button>
    </div>
  );
}

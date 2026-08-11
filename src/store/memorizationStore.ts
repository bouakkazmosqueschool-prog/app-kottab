import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MemorizationRecord } from '../types';
import { supabase } from '../lib/supabaseClient';

type RecordRow = {
  id: string;
  student_id: string;
  surah_id: number;
  start_verse: number;
  end_verse: number;
  date: string;
  notes: string | null;
  created_at: string;
};

function rowToRecord(row: RecordRow): MemorizationRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    surahId: row.surah_id,
    startVerse: row.start_verse,
    endVerse: row.end_verse,
    date: row.date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function generateRecordId(): string {
  return `mem_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

type NewRecord = Omit<MemorizationRecord, 'id' | 'createdAt'>;

interface MemorizationState {
  records: MemorizationRecord[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  addRecord: (data: NewRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<Omit<MemorizationRecord, 'id' | 'studentId' | 'createdAt'>>) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

export const useMemorizationStore = create<MemorizationState>()((set, get) => ({
  records: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (get().initialized || channel) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase.from('memorization_records').select('*').order('date', { ascending: false });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ records: (data as RecordRow[]).map(rowToRecord), loading: false, initialized: true });

    channel = supabase
      .channel('memorization-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memorization_records' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { records: state.records.filter((r) => r.id !== (payload.old as RecordRow).id) };
          }
          const updated = rowToRecord(payload.new as RecordRow);
          const exists = state.records.some((r) => r.id === updated.id);
          return { records: exists ? state.records.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...state.records] };
        });
      })
      .subscribe();
  },

  addRecord: async (data) => {
    const { error } = await supabase.from('memorization_records').insert({
      id: generateRecordId(),
      student_id: data.studentId,
      surah_id: data.surahId,
      start_verse: data.startVerse,
      end_verse: data.endVerse,
      date: data.date,
      notes: data.notes ?? null,
      created_at: new Date().toISOString(),
    });
    if (error) set({ error: error.message });
  },

  updateRecord: async (id, patch) => {
    const row: Record<string, unknown> = {};
    if (patch.surahId !== undefined) row.surah_id = patch.surahId;
    if (patch.startVerse !== undefined) row.start_verse = patch.startVerse;
    if (patch.endVerse !== undefined) row.end_verse = patch.endVerse;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    const { error } = await supabase.from('memorization_records').update(row).eq('id', id);
    if (error) set({ error: error.message });
  },

  removeRecord: async (id) => {
    const { error } = await supabase.from('memorization_records').delete().eq('id', id);
    if (error) set({ error: error.message });
  },
}));

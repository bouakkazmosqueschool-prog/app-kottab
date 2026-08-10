import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MemorizationRecord } from '../types';
import { generateId } from '../lib/id';
import { INITIAL_DATA } from '../data/initialData';

type NewRecord = Omit<MemorizationRecord, 'id' | 'createdAt'>;

interface MemorizationState {
  records: MemorizationRecord[];
  addRecord: (data: NewRecord) => MemorizationRecord;
  updateRecord: (id: string, patch: Partial<Omit<MemorizationRecord, 'id' | 'studentId' | 'createdAt'>>) => void;
  removeRecord: (id: string) => void;
  removeByStudent: (studentId: string) => void;
  setAll: (records: MemorizationRecord[]) => void;
}

export const useMemorizationStore = create<MemorizationState>()(
  persist(
    (set) => ({
      records: INITIAL_DATA.memorizationRecords,

      addRecord: (data) => {
        const record: MemorizationRecord = { id: generateId('mem'), createdAt: new Date().toISOString(), ...data };
        set((state) => ({ records: [record, ...state.records] }));
        return record;
      },

      updateRecord: (id, patch) => {
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },

      removeRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      removeByStudent: (studentId) => {
        set((state) => ({ records: state.records.filter((r) => r.studentId !== studentId) }));
      },

      setAll: (records) => set({ records }),
    }),
    { name: 'kottab-memorization-v1' },
  ),
);

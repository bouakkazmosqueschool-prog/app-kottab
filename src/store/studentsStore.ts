import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Student } from '../types';
import { supabase } from '../lib/supabaseClient';

type StudentRow = {
  id: string;
  full_name: string;
  level: string;
  guardian_phone: string | null;
  birth_date: string | null;
  join_date: string;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    fullName: row.full_name,
    level: row.level,
    guardianPhone: row.guardian_phone ?? undefined,
    birthDate: row.birth_date ?? undefined,
    joinDate: row.join_date,
    notes: row.notes ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateStudentId(): string {
  return `stu_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

type NewStudent = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean };

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  addStudent: (data: NewStudent) => Promise<void>;
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id' | 'createdAt'>>) => Promise<void>;
  /** يحذف التلميذ نهائياً — الحذف يمتد تلقائياً إلى أهدافه وسجلّ حفظه عبر ON DELETE CASCADE في قاعدة البيانات */
  removeStudent: (id: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

export const useStudentsStore = create<StudentsState>()((set, get) => ({
  students: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (get().initialized || channel) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase.from('students').select('*').order('full_name', { ascending: true });
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ students: (data as StudentRow[]).map(rowToStudent), loading: false, initialized: true });

    channel = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { students: state.students.filter((s) => s.id !== (payload.old as StudentRow).id) };
          }
          const updated = rowToStudent(payload.new as StudentRow);
          const exists = state.students.some((s) => s.id === updated.id);
          return {
            students: exists ? state.students.map((s) => (s.id === updated.id ? updated : s)) : [...state.students, updated],
          };
        });
      })
      .subscribe();
  },

  addStudent: async (data) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('students').insert({
      id: generateStudentId(),
      full_name: data.fullName,
      level: data.level,
      guardian_phone: data.guardianPhone ?? null,
      birth_date: data.birthDate ?? null,
      join_date: data.joinDate,
      notes: data.notes ?? null,
      active: data.active ?? true,
      created_at: now,
      updated_at: now,
    });
    if (error) set({ error: error.message });
  },

  updateStudent: async (id, patch) => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.level !== undefined) row.level = patch.level;
    if (patch.guardianPhone !== undefined) row.guardian_phone = patch.guardianPhone ?? null;
    if (patch.birthDate !== undefined) row.birth_date = patch.birthDate ?? null;
    if (patch.joinDate !== undefined) row.join_date = patch.joinDate;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    if (patch.active !== undefined) row.active = patch.active;
    const { error } = await supabase.from('students').update(row).eq('id', id);
    if (error) set({ error: error.message });
  },

  removeStudent: async (id) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) set({ error: error.message });
  },
}));

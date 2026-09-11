import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Student } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './authStore';
import { canSeeAllStudents } from '../data/teachers';

type StudentRow = {
  id: string;
  student_number: number;
  full_name: string;
  level: string;
  guardian_phone: string | null;
  birth_date: string | null;
  join_date: string;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    studentNumber: row.student_number,
    fullName: row.full_name,
    level: row.level,
    guardianPhone: row.guardian_phone ?? undefined,
    birthDate: row.birth_date ?? undefined,
    joinDate: row.join_date,
    notes: row.notes ?? undefined,
    active: row.active,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateStudentId(): string {
  return `stu_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/** studentNumber يُسند تلقائياً من قاعدة البيانات (تسلسل)، لا يُحدَّد من العميل */
type NewStudent = Omit<Student, 'id' | 'studentNumber' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean };

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  addStudent: (data: NewStudent) => Promise<void>;
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id' | 'createdAt'>>) => Promise<void>;
  /** يحذف الطالب نهائياً — الحذف يمتد تلقائياً إلى أهدافه وسجلّ حفظه عبر ON DELETE CASCADE في قاعدة البيانات */
  removeStudent: (id: string) => Promise<void>;
  /** يُفرّغ الحالة ويُلغي الاشتراك المباشر — يُستدعى عند تسجيل الخروج ليُعاد التحميل لأستاذ آخر */
  reset: () => void;
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

    // عزل التلاميذ حسب الأستاذ: كل أستاذ يرى فقط من أنشأهم، إلا الأستاذ المشرف فيرى الجميع.
    // القاعدة مطبَّقة أساساً على مستوى قاعدة البيانات (RLS)؛ والفلترة هنا طبقة حماية إضافية.
    const session = useAuthStore.getState().session;
    const teacherId = session?.teacherId;
    const superTeacher = canSeeAllStudents(session?.teacherName);

    let query = supabase.from('students').select('*').order('student_number', { ascending: true });
    if (!superTeacher && teacherId) query = query.eq('created_by', teacherId);

    const { data, error } = await query;
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ students: (data as StudentRow[]).map(rowToStudent), loading: false, initialized: true });

    /** هل يخصّ هذا الطالب الأستاذ الحالي (أو أنّه المشرف)؟ */
    const isVisible = (s: Student) => superTeacher || !teacherId || s.createdBy === teacherId;

    channel = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { students: state.students.filter((s) => s.id !== (payload.old as StudentRow).id) };
          }
          const updated = rowToStudent(payload.new as StudentRow);
          const exists = state.students.some((s) => s.id === updated.id);
          // تجاهل تلاميذ أستاذ آخر إن وصلت أحداثهم عبر البثّ المباشر
          if (!isVisible(updated)) {
            return exists ? { students: state.students.filter((s) => s.id !== updated.id) } : state;
          }
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
      // ربط الطالب بالأستاذ المنشئ (auth.uid() تلقائياً في قاعدة البيانات، ونُثبّته هنا صراحةً)
      created_by: useAuthStore.getState().session?.teacherId ?? null,
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

  reset: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    set({ students: [], loading: false, error: null, initialized: false });
  },
}));

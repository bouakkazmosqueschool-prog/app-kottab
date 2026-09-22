import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export interface TeacherProfile {
  id: string;
  name: string;
  role: string;
}

interface TeacherProfilesState {
  profiles: TeacherProfile[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  reset: () => void;
}

let initStarted = false;

/**
 * قائمة الأساتذة (id ↔ name ↔ role) لربط الطالب بأستاذه المُنشئ (created_by).
 * القراءة متاحة لكل مستخدم مسجَّل عبر RLS. لا حاجة لبثّ مباشر (القائمة شبه ثابتة).
 */
export const useTeacherProfilesStore = create<TeacherProfilesState>((set) => ({
  profiles: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    set({ loading: true, error: null });
    const { data, error } = await supabase.from('teacher_profiles').select('id,name,role').order('name');
    if (error) {
      initStarted = false;
      set({ loading: false, error: error.message });
      return;
    }
    set({ profiles: data as TeacherProfile[], loading: false, initialized: true });
  },

  reset: () => {
    initStarted = false;
    set({ profiles: [], loading: false, error: null, initialized: false });
  },
}));

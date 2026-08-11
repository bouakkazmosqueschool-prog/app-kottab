import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, Halqa } from '../types';
import { findTeacher } from '../data/teachers';

interface AuthState {
  session: AuthSession | null;
  /** يتحقق من الاسم وكلمة المرور، ويحفظ هوية المعلم مؤقتاً (بدون حلقة بعد) */
  pendingTeacher: { id: string; name: string } | null;
  login: (name: string, password: string) => boolean;
  chooseHalqa: (halqa: Halqa) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      pendingTeacher: null,

      login: (name, password) => {
        const teacher = findTeacher(name, password);
        if (!teacher) return false;
        set({ pendingTeacher: { id: teacher.id, name: teacher.name } });
        return true;
      },

      chooseHalqa: (halqa) => {
        set((state) => {
          if (!state.pendingTeacher) return state;
          return {
            session: { teacherId: state.pendingTeacher.id, teacherName: state.pendingTeacher.name, halqa },
            pendingTeacher: null,
          };
        });
      },

      logout: () => set({ session: null, pendingTeacher: null }),
    }),
    { name: 'kottab-auth-v1' },
  ),
);

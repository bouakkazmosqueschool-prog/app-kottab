import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, Halqa } from '../types';
import { supabase } from '../lib/supabaseClient';
import { TEACHER_ACCOUNTS } from '../data/teachers';

interface AuthState {
  session: AuthSession | null;
  pendingTeacher: { id: string; name: string } | null;
  loading: boolean;
  error: string | null;
  login: (name: string, password: string) => Promise<boolean>;
  chooseHalqa: (halqa: Halqa) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      pendingTeacher: null,
      loading: false,
      error: null,

      login: async (name, password) => {
        set({ loading: true, error: null });
        const account = TEACHER_ACCOUNTS.find((t) => t.name === name.trim());
        if (!account) {
          set({ loading: false, error: 'اسم الأستاذ غير معروف' });
          return false;
        }
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: account.email, password });
          if (error) {
            // نفرّق بين خطأ بيانات الدخول الفعلي وأي عطل آخر (شبكة/إعداد المشروع)
            const isInvalidCredentials = error.status === 400 || /invalid/i.test(error.message);
            set({
              loading: false,
              error: isInvalidCredentials ? 'اسم الأستاذ أو كلمة المرور غير صحيحة' : `تعذّر الاتصال بالخادم: ${error.message}`,
            });
            return false;
          }
          if (!data.user) {
            set({ loading: false, error: 'تعذّر تسجيل الدخول لسبب غير معروف' });
            return false;
          }
          set({ pendingTeacher: { id: data.user.id, name: account.name }, loading: false, error: null });
          return true;
        } catch (e) {
          set({ loading: false, error: `تعذّر الاتصال بالخادم. تحقق من الاتصال بالإنترنت. (${(e as Error).message})` });
          return false;
        }
      },

      chooseHalqa: (halqa) => {
        const pending = get().pendingTeacher;
        if (!pending) return;
        set({
          session: { teacherId: pending.id, teacherName: pending.name, halqa },
          pendingTeacher: null,
        });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ session: null, pendingTeacher: null });
      },
    }),
    { name: 'kottab-auth-v1' },
  ),
);

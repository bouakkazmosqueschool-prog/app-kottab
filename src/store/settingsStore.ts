import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';
import { supabase } from '../lib/supabaseClient';

export const DEFAULT_SETTINGS: AppSettings = {
  schoolName: 'كُتّاب مسجد بوعكاز القديم',
  defaultPeriodType: 'month',
  darkMode: false,
};

type SharedSettings = Pick<AppSettings, 'schoolName' | 'defaultPeriodType'>;

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  /** يجلب schoolName/defaultPeriodType من Supabase (صف مشترك واحد) */
  init: () => Promise<void>;
  /** يحدّث الإعدادات المشتركة في Supabase + darkMode محلياً في هذا المتصفح فقط */
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      loading: false,
      error: null,
      initialized: false,

      init: async () => {
        if (get().initialized) return;
        set({ loading: true, error: null });
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
        if (error) {
          set({ loading: false, error: error.message });
          return;
        }
        set((state) => ({
          settings: {
            ...state.settings,
            schoolName: data.school_name,
            defaultPeriodType: data.default_period_type,
          },
          loading: false,
          initialized: true,
        }));
      },

      updateSettings: async (patch) => {
        // darkMode يبقى محلياً فقط (تفضيل شخصي لكل جهاز/متصفح)
        if (patch.darkMode !== undefined) {
          set((state) => ({ settings: { ...state.settings, darkMode: patch.darkMode! } }));
        }
        const shared: Partial<SharedSettings> = {};
        if (patch.schoolName !== undefined) shared.schoolName = patch.schoolName;
        if (patch.defaultPeriodType !== undefined) shared.defaultPeriodType = patch.defaultPeriodType;
        if (Object.keys(shared).length === 0) return;

        const row: Record<string, unknown> = {};
        if (shared.schoolName !== undefined) row.school_name = shared.schoolName;
        if (shared.defaultPeriodType !== undefined) row.default_period_type = shared.defaultPeriodType;
        const { error } = await supabase.from('app_settings').update(row).eq('id', 1);
        if (error) {
          set({ error: error.message });
          return;
        }
        set((state) => ({ settings: { ...state.settings, ...shared } }));
      },
    }),
    { name: 'kottab-settings-v1' },
  ),
);

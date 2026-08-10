import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  schoolName: 'كُتّاب مسجد بوعكاز القديم',
  teacherName: '',
  defaultPeriodType: 'week',
  darkMode: false,
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setAll: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      setAll: (settings) => set({ settings }),
    }),
    { name: 'kottab-settings-v1' },
  ),
);

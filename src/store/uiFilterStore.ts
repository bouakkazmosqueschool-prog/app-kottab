import { create } from 'zustand';

/**
 * فلتر عام لكامل التطبيق: عند تفعيله تُعرض بيانات الطلبة المتميّزين فقط
 * في كل الصفحات (لوحة التحكم، الطلاب، الحضور، الأهداف، الإنجاز، التقارير، الأداءات).
 */
interface UiFilterState {
  onlyStarred: boolean;
  level: string;
  setLevel: (level: string) => void;
  setOnlyStarred: (v: boolean) => void;
  toggleStarred: () => void;
  reset: () => void;
}

export const useUiFilterStore = create<UiFilterState>((set) => ({
  onlyStarred: false,
  level: 'all',
  setLevel: (level) => set({ level }),
  setOnlyStarred: (v) => set({ onlyStarred: v }),
  toggleStarred: () => set((s) => ({ onlyStarred: !s.onlyStarred })),
  reset: () => set({ onlyStarred: false, level: 'all' }),
}));

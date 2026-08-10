import type { DataBundle } from '../types';
import { INITIAL_DATA } from '../data/initialData';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useMemorizationStore } from '../store/memorizationStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '../store/settingsStore';

/** يعيد كل البيانات إلى الحزمة التجريبية الأصلية (نفس المعرّفات في كل مرة) */
export function resetAllToSeed(): void {
  useStudentsStore.getState().setAll(INITIAL_DATA.students);
  useGoalsStore.getState().setAll(INITIAL_DATA.goals);
  useMemorizationStore.getState().setAll(INITIAL_DATA.memorizationRecords);
}

export function buildExportBundle(): DataBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    students: useStudentsStore.getState().students,
    goals: useGoalsStore.getState().goals,
    memorizationRecords: useMemorizationStore.getState().records,
    settings: useSettingsStore.getState().settings,
  };
}

export function isValidDataBundle(obj: unknown): obj is DataBundle {
  if (!obj || typeof obj !== 'object') return false;
  const b = obj as Record<string, unknown>;
  return Array.isArray(b.students) && Array.isArray(b.goals) && Array.isArray(b.memorizationRecords);
}

export function applyImportedBundle(bundle: DataBundle): void {
  useStudentsStore.getState().setAll(bundle.students);
  useGoalsStore.getState().setAll(bundle.goals);
  useMemorizationStore.getState().setAll(bundle.memorizationRecords);
  if (bundle.settings) {
    useSettingsStore.getState().setAll({ ...DEFAULT_SETTINGS, ...bundle.settings });
  }
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2), 'application/json');
}

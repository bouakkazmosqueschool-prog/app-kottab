import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useMemorizationStore } from '../store/memorizationStore';

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

/**
 * نسخة احتياطية للقراءة فقط من الحالة الحالية المحمَّلة من Supabase.
 * ملاحظة: Supabase هو مصدر الحقيقة الآن — هذا التصدير للأرشفة فقط،
 * وليس آلية استيراد/استعادة (لا يوجد applyImportedBundle مقابل).
 */
export function buildExportSnapshot() {
  return {
    exportedAt: new Date().toISOString(),
    students: useStudentsStore.getState().students,
    goals: useGoalsStore.getState().goals,
    memorizationRecords: useMemorizationStore.getState().records,
  };
}

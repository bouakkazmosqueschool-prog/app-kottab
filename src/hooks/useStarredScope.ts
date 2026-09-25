import { useMemo } from 'react';
import { useStudentsStore } from '../store/studentsStore';
import { useUiFilterStore } from '../store/uiFilterStore';

/**
 * الفلتر العام "المتميّزون": يوفّر مجموعة معرّفات الطلبة المتميّزين وحالة التفعيل،
 * لتصفية التلاميذ وبياناتهم (أهداف/أداءات/حضور...) في كل الصفحات.
 */
export function useStarredScope() {
  const onlyStarred = useUiFilterStore((s) => s.onlyStarred);
  const students = useStudentsStore((s) => s.students);
  const starredIds = useMemo(() => new Set(students.filter((s) => s.starred).map((s) => s.id)), [students]);
  return { onlyStarred, starredIds };
}

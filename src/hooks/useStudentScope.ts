import { useMemo } from 'react';
import { useStudentsStore } from '../store/studentsStore';
import { useUiFilterStore } from '../store/uiFilterStore';
import { scopedStudentIds } from '../lib/studentScope';

/** Shared display filters; never alter the underlying student records. */
export function useStudentScope() {
  const onlyStarred = useUiFilterStore(s => s.onlyStarred);
  const level = useUiFilterStore(s => s.level);
  const students = useStudentsStore(s => s.students);
  const studentIds = useMemo(() => scopedStudentIds(students, level, onlyStarred), [students, onlyStarred, level]);
  return { scopeActive: onlyStarred || level !== 'all', studentIds };
}

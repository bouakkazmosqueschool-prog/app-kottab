export function scopedStudentIds(
  students: readonly { id: string; level: string; starred?: boolean }[],
  level: string,
  onlyStarred: boolean,
): Set<string> {
  return new Set(students
    .filter(s => (!onlyStarred || s.starred) && (level === 'all' || s.level === level))
    .map(s => s.id));
}

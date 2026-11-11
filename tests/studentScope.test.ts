import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scopedStudentIds } from '../src/lib/studentScope.ts';

const students = [
  { id: 'a', level: 'المستوى الأول', starred: true },
  { id: 'b', level: 'المستوى الثالث', starred: true },
  { id: 'c', level: 'المستوى الثالث', starred: false },
];

test('all levels preserves students; selecting a level also scopes related records', () => {
  assert.deepEqual([...scopedStudentIds(students, 'all', false)], ['a', 'b', 'c']);
  const ids = scopedStudentIds(students, 'المستوى الثالث', false);
  assert.deepEqual([...ids], ['b', 'c']);
  const payments = [{ studentId: 'a' }, { studentId: 'b' }];
  assert.deepEqual(payments.filter(p => ids.has(p.studentId)), [{ studentId: 'b' }]);
});

test('level and starred filters intersect, including levels without students', () => {
  assert.deepEqual([...scopedStudentIds(students, 'المستوى الثالث', true)], ['b']);
  assert.deepEqual([...scopedStudentIds(students, 'all', true)], ['a', 'b']);
  assert.deepEqual([...scopedStudentIds(students, 'المستوى الثاني', false)], []);
});

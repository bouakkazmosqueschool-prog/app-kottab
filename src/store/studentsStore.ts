import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student } from '../types';
import { generateId } from '../lib/id';
import { todayISO } from '../lib/dates';
import { INITIAL_DATA } from '../data/initialData';
import { useGoalsStore } from './goalsStore';
import { useMemorizationStore } from './memorizationStore';

type NewStudent = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'active'> & { active?: boolean };

interface StudentsState {
  students: Student[];
  addStudent: (data: NewStudent) => Student;
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id' | 'createdAt'>>) => void;
  /** يحذف التلميذ نهائياً مع كل أهدافه وسجلّ حفظه (تسلسل الحذف) */
  removeStudent: (id: string) => void;
  setAll: (students: Student[]) => void;
}

export const useStudentsStore = create<StudentsState>()(
  persist(
    (set) => ({
      students: INITIAL_DATA.students,

      addStudent: (data) => {
        const now = todayISO();
        const student: Student = {
          id: generateId('stu'),
          active: true,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        set((state) => ({ students: [...state.students, student] }));
        return student;
      },

      updateStudent: (id, patch) => {
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: todayISO() } : s)),
        }));
      },

      removeStudent: (id) => {
        set((state) => ({ students: state.students.filter((s) => s.id !== id) }));
        useGoalsStore.getState().removeByStudent(id);
        useMemorizationStore.getState().removeByStudent(id);
      },

      setAll: (students) => set({ students }),
    }),
    { name: 'kottab-students-v1' },
  ),
);

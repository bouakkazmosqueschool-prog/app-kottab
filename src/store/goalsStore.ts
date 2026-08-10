import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal } from '../types';
import { generateId } from '../lib/id';
import { todayISO } from '../lib/dates';
import { INITIAL_DATA } from '../data/initialData';

type NewGoal = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;

interface GoalsState {
  goals: Goal[];
  addGoal: (data: NewGoal) => Goal;
  addGoalsBatch: (dataList: NewGoal[]) => Goal[];
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id' | 'studentId' | 'createdAt'>>) => void;
  removeGoal: (id: string) => void;
  removeByStudent: (studentId: string) => void;
  setAll: (goals: Goal[]) => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: INITIAL_DATA.goals,

      addGoal: (data) => {
        const now = todayISO();
        const goal: Goal = { id: generateId('goal'), createdAt: now, updatedAt: now, ...data };
        set((state) => ({ goals: [...state.goals, goal] }));
        return goal;
      },

      addGoalsBatch: (dataList) => {
        const now = todayISO();
        const newGoals = dataList.map((data) => ({
          id: generateId('goal'),
          createdAt: now,
          updatedAt: now,
          ...data,
        }));
        set((state) => ({ goals: [...state.goals, ...newGoals] }));
        return newGoals;
      },

      updateGoal: (id, patch) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: todayISO() } : g)),
        }));
      },

      removeGoal: (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
      },

      removeByStudent: (studentId) => {
        set((state) => ({ goals: state.goals.filter((g) => g.studentId !== studentId) }));
      },

      setAll: (goals) => set({ goals }),
    }),
    { name: 'kottab-goals-v1' },
  ),
);

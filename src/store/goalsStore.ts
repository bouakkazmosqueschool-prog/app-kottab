import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Goal } from '../types';
import { supabase } from '../lib/supabaseClient';

type GoalRow = {
  id: string;
  student_id: string;
  type: Goal['type'];
  unit: Goal['unit'];
  target_amount: number;
  achieved_amount: number | null;
  period_type: Goal['periodType'];
  period_label: string;
  start_date: string;
  end_date: string;
  teacher_name: string | null;
  range_description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    studentId: row.student_id,
    type: row.type,
    unit: row.unit,
    targetAmount: row.target_amount,
    achievedAmount: row.achieved_amount,
    periodType: row.period_type,
    periodLabel: row.period_label,
    startDate: row.start_date,
    endDate: row.end_date,
    teacherName: row.teacher_name ?? undefined,
    rangeDescription: row.range_description ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateGoalId(): string {
  return `goal_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

type NewGoal = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>;

interface GoalsState {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  addGoal: (data: NewGoal) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id' | 'studentId' | 'createdAt'>>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

export const useGoalsStore = create<GoalsState>()((set, get) => ({
  goals: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (get().initialized || channel) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase.from('goals').select('*');
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    set({ goals: (data as GoalRow[]).map(rowToGoal), loading: false, initialized: true });

    channel = supabase
      .channel('goals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { goals: state.goals.filter((g) => g.id !== (payload.old as GoalRow).id) };
          }
          const updated = rowToGoal(payload.new as GoalRow);
          const exists = state.goals.some((g) => g.id === updated.id);
          return { goals: exists ? state.goals.map((g) => (g.id === updated.id ? updated : g)) : [...state.goals, updated] };
        });
      })
      .subscribe();
  },

  addGoal: async (data) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('goals').insert({
      id: generateGoalId(),
      student_id: data.studentId,
      type: data.type,
      unit: data.unit,
      target_amount: data.targetAmount,
      achieved_amount: data.achievedAmount,
      period_type: data.periodType,
      period_label: data.periodLabel,
      start_date: data.startDate,
      end_date: data.endDate,
      teacher_name: data.teacherName ?? null,
      range_description: data.rangeDescription ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    });
    if (error) set({ error: error.message });
  },

  updateGoal: async (id, patch) => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.unit !== undefined) row.unit = patch.unit;
    if (patch.targetAmount !== undefined) row.target_amount = patch.targetAmount;
    if (patch.achievedAmount !== undefined) row.achieved_amount = patch.achievedAmount;
    if (patch.periodType !== undefined) row.period_type = patch.periodType;
    if (patch.periodLabel !== undefined) row.period_label = patch.periodLabel;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.teacherName !== undefined) row.teacher_name = patch.teacherName ?? null;
    if (patch.rangeDescription !== undefined) row.range_description = patch.rangeDescription ?? null;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    const { error } = await supabase.from('goals').update(row).eq('id', id);
    if (error) set({ error: error.message });
  },

  removeGoal: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) set({ error: error.message });
  },
}));

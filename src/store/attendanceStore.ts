import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Attendance, AttendanceStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './authStore';

type AttendanceRow = {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    status: row.status,
    recordedBy: row.recorded_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateId(): string {
  return `att_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

interface AttendanceState {
  records: Attendance[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  /** يسجّل/يُحدّث حالة حضور تلميذ في يوم (حاضر/غائب). الأستاذ ومدير النظام فقط عبر RLS. */
  setStatus: (studentId: string, date: string, status: AttendanceStatus) => Promise<void>;
  /** يمسح تسجيل حضور تلميذ في يوم (يرجعه إلى "غير مسجَّل"). */
  clear: (studentId: string, date: string) => Promise<void>;
  reset: () => void;
}

let channel: RealtimeChannel | null = null;
let initStarted = false;

export const useAttendanceStore = create<AttendanceState>()((set, get) => ({
  records: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    set({ loading: true, error: null });

    // RLS تُرجع فقط سجلات التلاميذ المرئيين للمستخدم (أستاذهم أو المدير/المشرف)
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) {
      initStarted = false;
      set({ loading: false, error: error.message });
      return;
    }
    set({ records: (data as AttendanceRow[]).map(rowToAttendance), loading: false, initialized: true });

    channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { records: state.records.filter((r) => r.id !== (payload.old as AttendanceRow).id) };
          }
          const updated = rowToAttendance(payload.new as AttendanceRow);
          const exists = state.records.some((r) => r.id === updated.id);
          return {
            records: exists ? state.records.map((r) => (r.id === updated.id ? updated : r)) : [...state.records, updated],
          };
        });
      })
      .subscribe();
  },

  setStatus: async (studentId, date, status) => {
    const existing = get().records.find((r) => r.studentId === studentId && r.date === date);
    const now = new Date().toISOString();
    const { error } = await supabase.from('attendance').upsert(
      {
        id: existing?.id ?? generateId(),
        student_id: studentId,
        date,
        status,
        recorded_by: useAuthStore.getState().session?.teacherId ?? null,
        created_at: existing?.createdAt ?? now,
        updated_at: now,
      },
      { onConflict: 'student_id,date' },
    );
    if (error) set({ error: error.message });
  },

  clear: async (studentId, date) => {
    const existing = get().records.find((r) => r.studentId === studentId && r.date === date);
    if (!existing) return;
    const { error } = await supabase.from('attendance').delete().eq('id', existing.id);
    if (error) set({ error: error.message });
  },

  reset: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    initStarted = false;
    set({ records: [], loading: false, error: null, initialized: false });
  },
}));

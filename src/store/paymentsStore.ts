import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Payment } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './authStore';
import { todayISO } from '../lib/dates';

type PaymentRow = {
  id: string;
  student_id: string;
  period: string;
  amount: number;
  paid_at: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    studentId: row.student_id,
    period: row.period,
    amount: row.amount,
    paidAt: row.paid_at,
    recordedBy: row.recorded_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generatePaymentId(): string {
  return `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

interface PaymentsState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  /** يسجّل أو يُحدّث أداء تلميذ لشهر معيّن (المبلغ حرّ). المشرف المالي فقط عبر RLS. */
  setPayment: (studentId: string, period: string, amount: number) => Promise<void>;
  /**
   * يسجّل مبلغاً حرّاً يغطّي عدة أشهر لتلميذ (يُوزَّع بالتساوي على الأشهر المختارة).
   * مثال: 100 درهم للشهرين 9 و10 → 50 لكل شهر.
   */
  recordPayment: (studentId: string, periods: string[], totalAmount: number) => Promise<void>;
  reset: () => void;
}

let channel: RealtimeChannel | null = null;
// درع متزامن ضدّ الاستدعاء المزدوج لـ init (مثلاً StrictMode في التطوير)
let initStarted = false;

export const usePaymentsStore = create<PaymentsState>()((set, get) => ({
  payments: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    set({ loading: true, error: null });

    // تقرير الأداءات متاح للجميع، لذا نجلب كل الأداءات (الفلترة حسب الدور تتم في الواجهة
    // بالاعتماد على قائمة التلاميذ المرئية لكل مستخدم).
    const { data, error } = await supabase.from('payments').select('*');
    if (error) {
      initStarted = false;
      set({ loading: false, error: error.message });
      return;
    }
    set({ payments: (data as PaymentRow[]).map(rowToPayment), loading: false, initialized: true });

    channel = supabase
      .channel('payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            return { payments: state.payments.filter((p) => p.id !== (payload.old as PaymentRow).id) };
          }
          const updated = rowToPayment(payload.new as PaymentRow);
          const exists = state.payments.some((p) => p.id === updated.id);
          return {
            payments: exists ? state.payments.map((p) => (p.id === updated.id ? updated : p)) : [...state.payments, updated],
          };
        });
      })
      .subscribe();
  },

  setPayment: async (studentId, period, amount) => {
    const existing = get().payments.find((p) => p.studentId === studentId && p.period === period);
    const now = new Date().toISOString();
    const { error } = await supabase.from('payments').upsert(
      {
        id: existing?.id ?? generatePaymentId(),
        student_id: studentId,
        period,
        amount,
        paid_at: todayISO(),
        recorded_by: useAuthStore.getState().session?.teacherId ?? null,
        created_at: existing?.createdAt ?? now,
        updated_at: now,
      },
      { onConflict: 'student_id,period' },
    );
    if (error) set({ error: error.message });
  },

  recordPayment: async (studentId, periods, totalAmount) => {
    if (periods.length === 0) return;
    const perMonth = totalAmount / periods.length;
    await Promise.all(periods.map((p) => get().setPayment(studentId, p, perMonth)));
  },

  reset: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    initStarted = false;
    set({ payments: [], loading: false, error: null, initialized: false });
  },
}));

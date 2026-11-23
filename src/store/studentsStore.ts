import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Student } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from './authStore';
import { canAssignStudentTeacher, canManageStudentPii, canSeeAllStudents, isSupervisor } from '../data/teachers';
import { toast } from './toastStore';
import { encryptPii, decryptPii } from '../lib/pii';

/** يفكّ تشفير الحقول الشخصية (الهاتف والصورة) لتلميذ */
async function withDecryptedPii(s: Student): Promise<Student> {
  const [guardianPhone, guardianWhatsApp, photo] = await Promise.all([
    decryptPii(s.guardianPhone), decryptPii(s.guardianWhatsApp), decryptPii(s.photo),
  ]);
  return { ...s, guardianPhone: guardianPhone || undefined, guardianWhatsApp: guardianWhatsApp || undefined, photo: photo || undefined };
}

type StudentRow = {
  id: string;
  student_number: number;
  full_name: string;
  level: string;
  guardian_phone: string | null;
  student_whatsapp_details?: { guardian_whatsapp: string } | null;
  photo: string | null;
  birth_date: string | null;
  join_date: string;
  notes: string | null;
  active: boolean;
  exempt: boolean;
  starred: boolean;
  attendance_days: number[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    studentNumber: row.student_number,
    fullName: row.full_name,
    level: row.level,
    guardianPhone: row.guardian_phone ?? undefined,
    guardianWhatsApp: row.student_whatsapp_details?.guardian_whatsapp ?? undefined,
    photo: row.photo ?? undefined,
    birthDate: row.birth_date ?? undefined,
    joinDate: row.join_date,
    notes: row.notes ?? undefined,
    active: row.active,
    exempt: row.exempt ?? false,
    starred: row.starred ?? false,
    attendanceDays: row.attendance_days ?? [],
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateStudentId(): string {
  return `stu_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/** studentNumber يُسند تلقائياً من قاعدة البيانات (تسلسل)، لا يُحدَّد من العميل */
type NewStudent = Omit<
  Student,
  'id' | 'studentNumber' | 'createdAt' | 'updatedAt' | 'active' | 'exempt' | 'starred' | 'attendanceDays'
> & {
  active?: boolean;
  exempt?: boolean;
  starred?: boolean;
  attendanceDays?: number[];
};

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  addStudent: (data: NewStudent) => Promise<boolean>;
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id' | 'createdAt'>>) => Promise<boolean>;
  /** يحذف الطالب نهائياً — الحذف يمتد تلقائياً إلى أهدافه وسجلّ حفظه عبر ON DELETE CASCADE في قاعدة البيانات */
  removeStudent: (id: string) => Promise<void>;
  /** يُفرّغ الحالة ويُلغي الاشتراك المباشر — يُستدعى عند تسجيل الخروج ليُعاد التحميل لأستاذ آخر */
  reset: () => void;
}

let channel: RealtimeChannel | null = null;
// درع متزامن ضدّ الاستدعاء المزدوج لـ init (مثلاً StrictMode في التطوير)
let initStarted = false;
const STUDENT_WITH_WHATSAPP = '*,student_whatsapp_details(guardian_whatsapp)';

async function encryptContactFields(data: Pick<Student, 'guardianPhone' | 'guardianWhatsApp' | 'photo'>) {
  try {
    const [phone, whatsApp, photo] = await Promise.all([
      encryptPii(data.guardianPhone), encryptPii(data.guardianWhatsApp), encryptPii(data.photo),
    ]);
    return {
      ...(data.guardianPhone !== undefined ? { guardian_phone: phone || null } : {}),
      ...(data.guardianWhatsApp !== undefined ? { guardian_whatsapp: whatsApp } : {}),
      ...(data.photo !== undefined ? { photo: photo || null } : {}),
    };
  } catch {
    toast.error('تعذّر تشفير بيانات الطالب الخاصة');
    return null;
  }
}

export const useStudentsStore = create<StudentsState>()((set) => ({
  students: [],
  loading: false,
  error: null,
  initialized: false,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    set({ loading: true, error: null });

    // عزل التلاميذ حسب الأستاذ: كل أستاذ يرى فقط من أنشأهم، إلا الأستاذ المشرف فيرى الجميع.
    // القاعدة مطبَّقة أساساً على مستوى قاعدة البيانات (RLS)؛ والفلترة هنا طبقة حماية إضافية.
    const session = useAuthStore.getState().session;
    const teacherId = session?.teacherId;
    const superTeacher = canSeeAllStudents(session?.teacherName);
    const canReadWhatsApp = canManageStudentPii(session?.teacherName);

    let query = supabase.from('students').select(canReadWhatsApp ? STUDENT_WITH_WHATSAPP : '*')
      .order('student_number', { ascending: true });
    if (!superTeacher && teacherId) query = query.eq('created_by', teacherId);

    const { data, error } = await query.overrideTypes<StudentRow[], { merge: false }>();
    if (error) {
      initStarted = false;
      set({ loading: false, error: error.message });
      return;
    }
    const decrypted = await Promise.all(data.map((row) => withDecryptedPii(rowToStudent(row))));
    set({ students: decrypted, loading: false, initialized: true });

    /** هل يخصّ هذا الطالب الأستاذ الحالي (أو أنّه المشرف)؟ */
    const isVisible = (s: Student) => superTeacher || !teacherId || s.createdBy === teacherId;

    channel = supabase
      .channel('students-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as StudentRow).id;
          set((state) => ({ students: state.students.filter((s) => s.id !== oldId) }));
          return;
        }
        void (async () => {
          let row = payload.new as StudentRow;
          if (canReadWhatsApp) {
            const { data } = await supabase.from('students').select(STUDENT_WITH_WHATSAPP)
              .eq('id', row.id).overrideTypes<StudentRow[], { merge: false }>();
            if (!data?.[0]) return;
            row = data[0];
          }
          const updated = await withDecryptedPii(rowToStudent(row));
          if (useAuthStore.getState().session?.teacherId !== teacherId) return;
          set((state) => {
            const exists = state.students.some((s) => s.id === updated.id);
            // تجاهل تلاميذ أستاذ آخر إن وصلت أحداثهم عبر البثّ المباشر
            if (!isVisible(updated)) {
              return exists ? { students: state.students.filter((s) => s.id !== updated.id) } : state;
            }
            return {
              students: exists ? state.students.map((s) => (s.id === updated.id ? updated : s)) : [...state.students, updated],
            };
          });
        })();
      })
      .subscribe();
  },

  addStudent: async (data) => {
    const now = new Date().toISOString();
    const session = useAuthStore.getState().session;
    // تشفير البيانات الشخصية قبل الحفظ (لا تُخزَّن في قاعدة البيانات إلا مشفَّرة)
    const privateFields = await encryptContactFields(data);
    if (!privateFields) return false;
    const { error } = await supabase.from('students').insert({
      id: generateStudentId(),
      full_name: data.fullName,
      level: data.level,
      ...privateFields,
      birth_date: data.birthDate ?? null,
      join_date: data.joinDate,
      notes: data.notes ?? null,
      active: data.active ?? true,
      exempt: data.exempt ?? false,
      starred: data.starred ?? false,
      attendance_days: data.attendanceDays ?? [],
      created_by: canAssignStudentTeacher(session?.teacherName)
        ? (data.createdBy ?? null)
        : (isSupervisor(session?.teacherName) ? null : session?.teacherId ?? null),
      created_at: now,
      updated_at: now,
    });
    if (error) {
      set({ error: error.message });
      toast.error('تعذّرت إضافة الطالب');
      return false;
    }
    toast.success('تمت إضافة الطالب بنجاح');
    return true;
  },

  updateStudent: async (id, patch) => {
    const privateFields = await encryptContactFields(patch);
    if (!privateFields) return false;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString(), ...privateFields };
    if (patch.fullName !== undefined) row.full_name = patch.fullName;
    if (patch.level !== undefined) row.level = patch.level;
    if (patch.birthDate !== undefined) row.birth_date = patch.birthDate ?? null;
    if (patch.joinDate !== undefined) row.join_date = patch.joinDate;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.exempt !== undefined) row.exempt = patch.exempt;
    if (patch.starred !== undefined) row.starred = patch.starred;
    if (patch.attendanceDays !== undefined) row.attendance_days = patch.attendanceDays;
    // يتحقق الخادم من صلاحية تغيير الأستاذ المسؤول.
    if (patch.createdBy !== undefined) row.created_by = patch.createdBy ?? null;
    const { error } = await supabase.from('students').update(row).eq('id', id);
    if (error) {
      set({ error: error.message });
      toast.error('تعذّر تحديث بيانات الطالب');
      return false;
    }
    toast.success('تم تحديث بيانات الطالب');
    return true;
  },

  removeStudent: async (id) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      set({ error: error.message });
      toast.error('تعذّر حذف الطالب');
    } else {
      toast.success('تم حذف الطالب');
    }
  },

  reset: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    initStarted = false;
    set({ students: [], loading: false, error: null, initialized: false });
  },
}));

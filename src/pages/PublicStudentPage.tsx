import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Goal, MemorizationRecord, Attendance, Payment } from '../types';
import { Card, Button } from '../components/ui/Primitives';
import { GoalStatusBadge, GoalTypeBadge } from '../components/ui/Badge';
import { computeGoal } from '../lib/goalCalculations';
import { formatShortDate } from '../lib/dates';
import { formatAmountWithUnit } from '../lib/constants';
import { getSurahById } from '../data/surahs';

interface PublicStudent {
  fullName: string;
  level: string;
  joinDate: string;
  goals: Pick<Goal, 'id' | 'type' | 'unit' | 'targetAmount' | 'achievedAmount' | 'periodLabel' | 'startDate' | 'endDate' | 'rangeDescription'>[];
  memorization: Pick<MemorizationRecord, 'id' | 'surahId' | 'startVerse' | 'endVerse' | 'date'>[];
  attendance: Pick<Attendance, 'date' | 'status'>[];
  payments: Pick<Payment, 'period' | 'amount' | 'paidAt'>[];
}

export default function PublicStudentPage() {
  const { token } = useParams();
  const [student, setStudent] = useState<PublicStudent | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'error'>('loading');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setStudent(null);
    setState('loading');
    async function load() {
      if (!token || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) {
        if (active) setState('invalid');
        return;
      }
      try {
        const { data, error } = await supabase.rpc('get_public_student', { p_token: token });
        if (!active) return;
        if (error) { setState('error'); return; }
        setStudent(data as PublicStudent | null);
        setState(data ? 'ready' : 'invalid');
      } catch { if (active) setState('error'); }
    }
    void load();
    // Recheck on focus so a revoked link cannot keep fetching fresh data.
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, [token, refresh]);

  return <main dir="rtl" className="min-h-screen bg-cream p-4 md:p-8">
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-ink">متابعة وليّ الأمر</h1>
      {state === 'loading' && <Card className="p-6" role="status">جارٍ تحميل بيانات الطالب…</Card>}
      {state === 'invalid' && <Card className="p-6">الرابط غير صالح أو تم تغييره. يرجى طلب الرابط الجديد من إدارة الكُتّاب.</Card>}
      {state === 'error' && <Card className="p-6 flex flex-col gap-3"><p>تعذّر تحميل البيانات. يرجى المحاولة مجدداً.</p><Button onClick={() => setRefresh((n) => n + 1)}>إعادة المحاولة</Button></Card>}
      {state === 'ready' && student && <>
        <Card className="p-5"><h2 className="font-display text-xl font-bold">{student.fullName}</h2><p>{student.level}</p><p className="text-sm text-ink-soft">تاريخ الالتحاق: {formatShortDate(student.joinDate)}</p></Card>
        <Card className="p-5"><h2 className="font-bold mb-3">الأهداف والإنجاز</h2>
          {!student.goals.length && <p>لا توجد أهداف بعد.</p>}
          {student.goals.map((goal) => <div key={goal.id} className="py-3 border-t border-line flex flex-wrap gap-3 items-center">
            <GoalTypeBadge type={goal.type} /><div className="flex-1"><p>{goal.periodLabel}</p><p className="text-sm text-ink-soft">{formatShortDate(goal.startDate)} — {formatShortDate(goal.endDate)}</p>
            <p className="text-sm">المطلوب: {formatAmountWithUnit(goal.targetAmount, goal.unit)} — المنجز: {goal.achievedAmount === null ? 'لم يُسجّل بعد' : formatAmountWithUnit(goal.achievedAmount, goal.unit)}</p>
            {goal.rangeDescription && <p className="text-sm">{goal.rangeDescription}</p>}</div><GoalStatusBadge status={computeGoal(goal).status} />
          </div>)}
        </Card>
        <Card className="p-5"><h2 className="font-bold mb-3">سجلّ الحفظ</h2>
          {!student.memorization.length && <p>لا يوجد سجلّ حفظ بعد.</p>}
          {student.memorization.map((r) => <p key={r.id} className="py-2 border-t border-line">{getSurahById(r.surahId)?.name} — الآيات {r.startVerse}–{r.endVerse} — {formatShortDate(r.date)}</p>)}
        </Card>
        <Card className="p-5"><h2 className="font-bold mb-3">الحضور والغياب</h2>
          {!student.attendance.length && <p>لا يوجد سجلّ حضور بعد.</p>}
          {student.attendance.map((a) => <p key={a.date} className="py-2 border-t border-line">{formatShortDate(a.date)} — {a.status === 'present' ? 'حاضر' : 'غائب'}</p>)}
        </Card>
        <Card className="p-5"><h2 className="font-bold mb-3">الأداءات المسجّلة</h2>
          {!student.payments.length && <p>لا توجد أداءات مسجّلة.</p>}
          {student.payments.map((p) => <p key={p.period} className="py-2 border-t border-line">{p.period} — {p.amount} درهم — {formatShortDate(p.paidAt)}</p>)}
        </Card>
        <Button variant="secondary" onClick={() => setRefresh((n) => n + 1)}>تحديث البيانات</Button>
      </>}
    </div>
  </main>;
}

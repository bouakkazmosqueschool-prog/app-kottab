import { useEffect, useState } from 'react';
import './PublicStudentPage.css';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Goal, MemorizationRecord, Attendance, Payment } from '../types';
import { Card, Button } from '../components/ui/Primitives';
import { GoalStatusBadge, GoalTypeBadge } from '../components/ui/Badge';
import { computeGoal } from '../lib/goalCalculations';
import { formatShortDate, currentMonthPeriod, datesOfMonth, formatMonthPeriod, parseISODate } from '../lib/dates';
import { formatAmountWithUnit } from '../lib/constants';
import { getSurahById } from '../data/surahs';

interface PublicStudent {
  fullName: string;
  teacherName: string | null;
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
  const [month, setMonth] = useState(currentMonthPeriod);
  const [absencesOnly, setAbsencesOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  const attendance = (student?.attendance ?? []).filter(a => a.date.startsWith(month)).sort((a,b) => b.date.localeCompare(a.date));
  const filtered = attendance.filter(a => !absencesOnly || a.status === 'absent');
  const months = [...new Set([currentMonthPeriod(), ...(student?.attendance ?? []).map(a => a.date.slice(0,7))])].sort().reverse();
  const payments = [...(student?.payments ?? [])].sort((a,b) => b.paidAt.localeCompare(a.paidAt));
  const statusLabel = (status?: string) => status === 'present' ? 'حاضر' : status === 'absent' ? 'غائب' : 'غير مسجّل';
  return <main dir="rtl" className="public-carnet min-h-screen p-4 md:p-8">
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <header className="carnet-header flex items-center justify-between gap-4 flex-wrap"><div className="flex items-center gap-3"><img src="/logo.png" alt="شعار الكُتّاب" className="h-16 w-16 object-contain" /><span className="font-display font-bold">كُتّاب مسجد بوعكاز القديم</span></div><span className="carnet-muted">دفتر المتابعة</span></header>
      {state === 'loading' && <Card className="p-6" role="status">جارٍ تحميل بيانات الطالب…</Card>}
      {state === 'invalid' && <Card className="p-6">الرابط غير صالح أو تم تغييره. يرجى طلب الرابط الجديد من إدارة الكُتّاب.</Card>}
      {state === 'error' && <Card className="p-6 flex flex-col gap-3"><p>تعذّر تحميل البيانات. يرجى المحاولة مجدداً.</p><Button onClick={() => setRefresh((n) => n + 1)}>إعادة المحاولة</Button></Card>}
      {state === 'ready' && student && <>
        <section className="text-center py-5"><p className="carnet-muted mb-2">متابعة وليّ الأمر</p><h1 className="font-display text-3xl font-bold mb-2">{student.fullName}</h1><p>الأستاذ: {student.teacherName?.trim() || 'غير محدَّد'}</p></section>
        <div className="grid md:grid-cols-2 gap-5 items-start">
        <section className="carnet-panel md:order-2"><h2>الأهداف والإنجاز</h2>
          {!student.goals.length && <p>لا توجد أهداف بعد.</p>}
          {student.goals.map((goal) => <div key={goal.id} className="py-3 border-t border-line flex flex-wrap gap-3 items-center">
            <GoalTypeBadge type={goal.type} /><div className="flex-1"><p>{goal.periodLabel}</p><p className="text-sm text-ink-soft">{formatShortDate(goal.startDate)} — {formatShortDate(goal.endDate)}</p>
            <p className="text-sm">المطلوب: {formatAmountWithUnit(goal.targetAmount, goal.unit)} — المنجز: {goal.achievedAmount === null ? 'لم يُسجّل بعد' : formatAmountWithUnit(goal.achievedAmount, goal.unit)}</p>
            {goal.rangeDescription && <p className="text-sm">{goal.rangeDescription}</p>}</div><GoalStatusBadge status={computeGoal(goal).status} />
            <div className="w-full carnet-progress" role="progressbar" aria-label={goal.periodLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, goal.targetAmount > 0 ? (goal.achievedAmount ?? 0) / goal.targetAmount * 100 : 0))}><span style={{width: `${Math.max(0, Math.min(100, goal.targetAmount > 0 ? (goal.achievedAmount ?? 0) / goal.targetAmount * 100 : 0))}%`}} /></div>
          </div>)}
        </section>
        <section className="carnet-panel md:order-1"><h2>رحلة التعلّم</h2>
          {!student.memorization.length && <p>لا يوجد سجلّ حفظ بعد.</p>}
          <div className="carnet-timeline">{student.memorization.map((r) => <article key={r.id}><p className="carnet-muted text-sm">{formatShortDate(r.date)}</p><h3 className="font-semibold">حفظ جديد</h3><p>{getSurahById(r.surahId)?.name} • الآيات {r.startVerse}–{r.endVerse}</p></article>)}</div>
        </section></div>
        <section className="carnet-panel"><div className="flex justify-between items-center gap-3 flex-wrap"><h2>الحضور والغياب</h2><label><span className="sr-only">الشهر</span><select className="carnet-select" value={month} onChange={e => {setMonth(e.target.value); setExpanded(false);}}>{months.map(m => <option key={m} value={m}>{formatMonthPeriod(m)}</option>)}</select></label></div>
          <div className="carnet-metrics"><div><strong>{attendance.filter(a => a.status === 'present').length}</strong><span>حصص حضور</span></div><div><strong>{attendance.filter(a => a.status === 'absent').length}</strong><span>حصص غياب</span></div><div><strong>{attendance.length}</strong><span>حصص مسجّلة</span></div></div>
          <div className="carnet-calendar" aria-label={`سجل ${formatMonthPeriod(month)}`}>
            {['س','أ','إ','ث','أر','خ','ج'].map((d,i) => <span key={i} aria-hidden="true" className="text-center carnet-muted text-xs">{d}</span>)}
            {Array.from({length: (parseISODate(`${month}-01`).getDay()+1)%7},(_,i) => <span key={`blank-${i}`} />)}
            {datesOfMonth(month).map(date => {const status = attendance.find(a => a.date === date)?.status; return <span key={date} className={`carnet-day ${status ?? ''}`} aria-label={`${formatShortDate(date)}: ${statusLabel(status)}`} title={`${formatShortDate(date)}: ${statusLabel(status)}`}>{Number(date.slice(-2))}<span className="text-xs">{status === 'present' ? '✓' : status === 'absent' ? '×' : '—'}</span></span>;})}
          </div><p className="carnet-muted text-sm mt-3">✓ حاضر • × غائب • — غير مسجّل</p>
          <div className="flex gap-2 mt-5 mb-3"><Button size="sm" variant={!absencesOnly ? 'primary' : 'secondary'} aria-pressed={!absencesOnly} onClick={() => setAbsencesOnly(false)}>الكل</Button><Button size="sm" variant={absencesOnly ? 'primary' : 'secondary'} aria-pressed={absencesOnly} onClick={() => setAbsencesOnly(true)}>الغياب فقط</Button></div>
          <div aria-live="polite">{!filtered.length && <p className="carnet-muted">{absencesOnly ? 'لا توجد غيابات مسجّلة لهذا الشهر.' : 'لا يوجد سجلّ حضور لهذا الشهر.'}</p>}{(expanded ? filtered : filtered.slice(0,3)).map(a => <div key={a.date} className="carnet-record flex justify-between gap-3"><span>{formatShortDate(a.date)}</span><span className={`carnet-badge ${a.status}`}>{statusLabel(a.status)}</span></div>)}</div>
          {filtered.length > 3 && <Button className="mt-3" variant="secondary" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'عرض آخر 3 حصص' : 'عرض السجل الكامل للشهر'}</Button>}
        </section>
        <section className="carnet-panel"><h2>الأداءات المسجّلة</h2>
          {!student.payments.length && <p>لا توجد أداءات مسجّلة.</p>}
          {!!payments.length && <div className="carnet-metrics"><div><strong>{payments.reduce((sum,p) => sum+Number(p.amount),0)} درهم</strong><span>مجموع الأداءات المسجّلة</span></div><div><strong>{payments.length}</strong><span>أداءات مسجّلة</span></div><div><strong>{formatShortDate(payments[0].paidAt)}</strong><span>تاريخ آخر أداء</span></div></div>}
          {payments.map(p => <div key={p.period} className="carnet-record flex items-center justify-between gap-3 flex-wrap"><div><h3 className="font-semibold">{formatMonthPeriod(p.period)}</h3><p className="carnet-muted text-sm">تاريخ الأداء: {formatShortDate(p.paidAt)}</p></div><strong>{p.amount} درهم</strong><span className="carnet-badge present">مسجّل</span></div>)}
          {!!payments.length && <p className="carnet-muted text-sm mt-3">تظهر هنا الأداءات المسجّلة فقط.</p>}
        </section>
        <Button variant="secondary" onClick={() => setRefresh((n) => n + 1)}>تحديث البيانات</Button>
      </>}
    </div>
  </main>;
}

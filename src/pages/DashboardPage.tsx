import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle, Sparkles, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useStudentsStore } from '../store/studentsStore';
import { useGoalsStore } from '../store/goalsStore';
import { useAuthStore } from '../store/authStore';
import { computeGoal, computeGoalStats } from '../lib/goalCalculations';
import { getWeekRange, toISODate, monthBucketKey, monthBucketLabel } from '../lib/dates';
import { HALQA_LABELS } from '../lib/constants';
import { SectionHeader, Card } from '../components/ui/Primitives';
import { StatCard, RadialProgress } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';

const CHART_COLORS = {
  bordeaux: '#6F303E',
  gold: '#F1A949',
  teal: '#3E6E64',
  clay: '#B0483C',
  inkSoft: '#6B5D54',
  line: '#ECE1D3',
};

export default function DashboardPage() {
  const students = useStudentsStore((s) => s.students);
  const allGoals = useGoalsStore((s) => s.goals);
  const session = useAuthStore((s) => s.session);
  const halqa = session?.halqa ?? 'hifz';

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const goals = useMemo(() => allGoals.filter((g) => g.type === halqa), [allGoals, halqa]);

  const overallStats = useMemo(() => computeGoalStats(goals), [goals]);

  const monthlyTrend = useMemo(() => {
    const monthGoals = goals.filter((g) => g.periodType === 'month' && g.achievedAmount !== null);
    const buckets = new Map<string, { label: string; sum: number; count: number; order: string }>();
    for (const g of monthGoals) {
      const key = monthBucketKey(g.startDate);
      const { percentage } = computeGoal(g);
      if (percentage === null) continue;
      const bucket = buckets.get(key) ?? { label: monthBucketLabel(g.startDate), sum: 0, count: 0, order: key };
      bucket.sum += percentage;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.order.localeCompare(b.order))
      .map((b) => ({ label: b.label, نسبة: Math.round((b.sum / b.count) * 10) / 10 }));
  }, [goals]);

  const statusDistribution = useMemo(
    () =>
      [
        { name: 'قيد الإنجاز', value: overallStats.pending, color: CHART_COLORS.inkSoft },
        { name: 'غير تام', value: overallStats.incomplete, color: CHART_COLORS.clay },
        { name: 'تم', value: overallStats.completed, color: CHART_COLORS.teal },
        { name: 'تم بزيادة', value: overallStats.completedPlus, color: CHART_COLORS.bordeaux },
      ].filter((d) => d.value > 0),
    [overallStats],
  );

  const topStudents = useMemo(() => {
    return activeStudents
      .map((student) => {
        const studentGoals = goals.filter((g) => g.studentId === student.id);
        const stats = computeGoalStats(studentGoals);
        return { student, stats };
      })
      .filter((x) => x.stats.averagePercentage !== null)
      .sort((a, b) => (b.stats.averagePercentage ?? 0) - (a.stats.averagePercentage ?? 0))
      .slice(0, 5);
  }, [activeStudents, goals]);

  /** طالب يظهر هنا إن كان آخر هدفين مسجَّلين له على التوالي بحالة "غير تام" */
  const strugglingStudents = useMemo(() => {
    const result: { student: (typeof activeStudents)[number]; streak: number; averagePercentage: number | null }[] = [];
    for (const student of activeStudents) {
      const recorded = goals
        .filter((g) => g.studentId === student.id && g.achievedAmount !== null)
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
      let streak = 0;
      for (const g of recorded) {
        if (computeGoal(g).status === 'incomplete') streak++;
        else break;
      }
      if (streak >= 2) {
        const stats = computeGoalStats(goals.filter((g) => g.studentId === student.id));
        result.push({ student, streak, averagePercentage: stats.averagePercentage });
      }
    }
    return result.sort((a, b) => b.streak - a.streak);
  }, [activeStudents, goals]);

  const currentWeekLabel = useMemo(() => {
    const { start, end } = getWeekRange(new Date());
    return `${toISODate(start)} → ${toISODate(end)}`;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="لوحة التحكم" subtitle={`${HALQA_LABELS[halqa]} — الأسبوع الحالي: ${currentWeekLabel}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="قيد الإنجاز" value={overallStats.pending} tone="default" />
        <StatCard icon={CheckCircle2} label="تم" value={overallStats.completed} tone="teal" />
        <StatCard icon={Sparkles} label="تم بزيادة" value={overallStats.completedPlus} tone="gold" />
        <StatCard icon={XCircle} label="غير تام" value={overallStats.incomplete} tone="clay" />
      </div>

      {strugglingStudents.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-clay/12 text-clay flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-ink">طلاب بحاجة إلى متابعة</h3>
              <p className="text-xs text-ink-soft">هدفان متتاليان على الأقل بحالة "غير تام"</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {strugglingStudents.map(({ student, streak, averagePercentage }) => (
              <Link
                key={student.id}
                to={`/students/${student.id}`}
                className="flex items-center gap-3 py-2.5 px-3 bg-cream rounded-lg border-e-[3px] border-clay hover:bg-clay/5 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-gold/20 text-bordeaux-dark text-[11px] font-bold flex items-center justify-center shrink-0">
                  #{student.studentNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{student.fullName}</p>
                  <p className="text-xs text-ink-soft">{student.level}</p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-semibold text-clay">{streak} أهداف غير تامة متتالية</p>
                  {averagePercentage !== null && <p className="text-[11px] text-ink-soft">معدل {averagePercentage}%</p>}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center gap-3">
          <RadialProgress percentage={overallStats.averagePercentage ?? 0} label="معدل الإنجاز العام" />
          <p className="text-xs text-ink-soft text-center">
            محسوب من متوسط نسب {overallStats.total - overallStats.pending} هدفاً مسجَّلاً
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-ink mb-4">توزيع حالات الإنجاز</h3>
          {statusDistribution.length === 0 ? (
            <EmptyState title="لا توجد أهداف بعد" />
          ) : (
            <div dir="ltr" className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ direction: 'rtl', fontFamily: 'Tajawal', borderRadius: 12, border: `1px solid ${CHART_COLORS.line}` }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {statusDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold text-ink mb-4">الأكثر تفوقاً هذه الفترة</h3>
        {topStudents.length === 0 ? (
          <EmptyState title="لا توجد بيانات كافية بعد" />
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {topStudents.map(({ student, stats }, idx) => (
              <Link
                key={student.id}
                to={`/students/${student.id}`}
                className="flex items-center gap-3 py-3 hover:bg-ink/3 -mx-1 px-1 rounded-lg transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gold/20 text-bordeaux-dark text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink truncate">{student.fullName}</span>
                <span className="text-xs text-ink-soft shrink-0">{student.level}</span>
                <span className="text-sm font-bold text-teal shrink-0 tabular-nums">{stats.averagePercentage}%</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {monthlyTrend.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink mb-4">معدل الإنجاز الشهري</h3>
          <div dir="ltr" className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.line} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.inkSoft }} />
                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.inkSoft }} domain={[0, 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ direction: 'rtl', fontFamily: 'Tajawal', borderRadius: 12, border: `1px solid ${CHART_COLORS.line}` }}
                  formatter={(value) => [`${value}%`, 'نسبة']}
                />
                <Bar dataKey="نسبة" fill={CHART_COLORS.teal} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

import type { Goal, GoalType, MemorizationRecord, Student } from '../types';
import { createRng, randChoice, randInt, roundToStep, chance, seededId, type Rng } from '../lib/rng';
import { addDays, buildPeriodLabel, getMonthRange, getWeekRange, toISODate } from '../lib/dates';
import { SURAHS } from './surahs';
import { TEACHER_ACCOUNTS } from './teachers';

/** كل حلقة (نوع هدف) تُسند إلى أستاذ افتراضي واحد في بيانات التجربة */
const TEACHER_FOR_TYPE: Record<GoalType, string> = {
  hifz: TEACHER_ACCOUNTS[0].name,
  murajaa: TEACHER_ACCOUNTS[1].name,
  alwah: TEACHER_ACCOUNTS[2].name,
};

interface StudentSeed {
  fullName: string;
  level: string;
  tendency: number; // 0..1, يميل نحو نسبة إنجاز أعلى كلما اقترب من 1
  guardianPhone?: string;
  joinDaysAgo: number;
  active: boolean;
}

const STUDENT_SEEDS: StudentSeed[] = [
  { fullName: 'محمد أمين', level: 'المستوى الثاني', tendency: 0.78, guardianPhone: '0612-345678', joinDaysAgo: 260, active: true },
  { fullName: 'عبد الرحمن الفاسي', level: 'المستوى الثالث', tendency: 0.9, guardianPhone: '0661-223344', joinDaysAgo: 540, active: true },
  { fullName: 'فاطمة الزهراء', level: 'المستوى الأول', tendency: 0.62, guardianPhone: '0699-887766', joinDaysAgo: 95, active: true },
  { fullName: 'يوسف بنعلي', level: 'المستوى الثاني', tendency: 0.5, joinDaysAgo: 310, active: true },
  { fullName: 'مريم الإدريسي', level: 'المستوى الثالث', tendency: 0.85, guardianPhone: '0677-556699', joinDaysAgo: 620, active: true },
  { fullName: 'عبد الله الحسني', level: 'المستوى الأول', tendency: 0.4, joinDaysAgo: 70, active: true },
  { fullName: 'آية الشرقاوي', level: 'المستوى الثاني', tendency: 0.7, guardianPhone: '0633-112233', joinDaysAgo: 200, active: true },
  { fullName: 'أنس التازي', level: 'المستوى الأول', tendency: 0.55, joinDaysAgo: 150, active: false },
];

const POSITIVE_NOTES = [
  'أداء ممتاز والتزام كبير بالحفظ',
  'ما شاء الله، مجهود واضح هذا الأسبوع',
  'تحسّن ملحوظ مقارنة بالفترة السابقة',
  'تسميع متقن وصوت واضح',
  'يستحق التشجيع أمام زملائه',
];
const NEUTRAL_NOTES = [
  'أداء مقبول، يحتاج إلى مزيد من المراجعة',
  'بعض الصعوبة في تثبيت الحفظ الجديد',
  'يحتاج إلى متابعة أكثر في المنزل',
  'التزام متوسط بالحضور',
];
const NEGATIVE_NOTES = [
  'غياب متكرر أثّر على الإنجاز',
  'يحتاج إلى تشجيع إضافي من الأسرة',
  'لم يحضر جميع الحصص هذا الأسبوع',
  'صعوبة واضحة، يُقترح تخفيف الكم مؤقتاً',
];

const MEMORIZATION_NOTES = ['تسميع جيد جداً', 'أتقن الحفظ بامتياز', 'يحتاج إعادة التسميع الأسبوع القادم', 'حفظ متين وثابت', ''];

function pickNote(rng: Rng, bucket: 'pos' | 'neu' | 'neg'): string | undefined {
  if (!chance(rng, 0.55)) return undefined;
  const pool = bucket === 'pos' ? POSITIVE_NOTES : bucket === 'neu' ? NEUTRAL_NOTES : NEGATIVE_NOTES;
  return randChoice(rng, pool);
}

/** يحدّد نسبة الإنجاز (منجز/مطلوب) بشكل واقعي حسب "ميل" التلميذ */
function rollAchievementRatio(rng: Rng, tendency: number): { ratio: number; bucket: 'pos' | 'neu' | 'neg' } {
  const roll = rng();
  const notCompletedT = 0.16 * (1 - tendency);
  const partialT = notCompletedT + 0.32 * (1 - tendency * 0.6);
  const exactT = partialT + 0.38;
  if (roll < notCompletedT) return { ratio: 0, bucket: 'neg' };
  if (roll < partialT) return { ratio: 0.25 + rng() * 0.5, bucket: 'neu' };
  if (roll < exactT) return { ratio: 1, bucket: 'pos' };
  return { ratio: 1 + rng() * 0.4, bucket: 'pos' };
}

function surahRangeForLevel(level: string): [number, number] {
  if (level.includes('الأول')) return [90, 114];
  if (level.includes('الثاني')) return [55, 114];
  return [1, 114];
}

export interface SeedBundle {
  students: Student[];
  goals: Goal[];
  memorizationRecords: MemorizationRecord[];
}

const NUM_PAST_WEEKS = 9; // + الأسبوع الحالي = 10 فترات أسبوعية
const NUM_PAST_MONTHS = 3; // + الشهر الحالي

export function generateSeedData(seed = 20260810): SeedBundle {
  const rng = createRng(seed);
  const now = new Date();
  const nowISO = toISODate(now);

  const students: Student[] = STUDENT_SEEDS.map((s) => {
    const joinDate = toISODate(addDays(now, -s.joinDaysAgo));
    return {
      id: seededId(rng, 'stu'),
      fullName: s.fullName,
      level: s.level,
      guardianPhone: s.guardianPhone,
      joinDate,
      active: s.active,
      createdAt: joinDate,
      updatedAt: nowISO,
    };
  });

  const goals: Goal[] = [];
  const memorizationRecords: MemorizationRecord[] = [];

  // ---------- أهداف أسبوعية (حفظ / مراجعة / الألواح) ----------
  for (let w = NUM_PAST_WEEKS; w >= 0; w--) {
    const anchor = addDays(now, -w * 7);
    const { start, end } = getWeekRange(anchor);
    const startISO = toISODate(start);
    const endISO = toISODate(end);
    const label = buildPeriodLabel('week', startISO, endISO);
    const isCurrent = w === 0;

    STUDENT_SEEDS.forEach((sSeed, idx) => {
      const student = students[idx];
      // التلميذ غير النشط يتوقف عن تلقي أهداف جديدة في آخر 3 أسابيع
      if (!sSeed.active && w < 3) return;

      const isExampleStudent = sSeed.fullName === 'محمد أمين' && isCurrent;

      const typeConfigs: { type: GoalType; target: number; unit: Goal['unit']; range?: string }[] = [
        {
          type: 'hifz',
          target: isExampleStudent ? 1 : roundToStep(0.5 + rng() * 1.5, 0.25),
          unit: sSeed.level === 'المستوى الثالث' && chance(rng, 0.3) ? 'nisf' : 'hizb',
        },
        {
          type: 'murajaa',
          target: isExampleStudent ? 2 : roundToStep(1 + rng() * 2, 0.25),
          unit: 'hizb',
        },
        {
          type: 'alwah',
          target: isExampleStudent ? 3 : roundToStep(1 + rng() * 3, 0.25),
          unit: chance(rng, 0.5) ? 'rub' : 'nisf',
        },
      ];

      // ميل التلميذ يتغيّر قليلاً كل أسبوع لواقعية أكبر
      const weekTendency = Math.min(1, Math.max(0, sSeed.tendency + (rng() - 0.5) * 0.25));

      typeConfigs.forEach((cfg) => {
        let achievedAmount: number | null = null;
        let notes: string | undefined;

        if (!isCurrent) {
          const { ratio, bucket } = rollAchievementRatio(rng, weekTendency);
          achievedAmount = Math.max(0, roundToStep(cfg.target * ratio, 0.25));
          notes = pickNote(rng, bucket);
        }

        const rangeDescription =
          cfg.type === 'hifz' && chance(rng, 0.3) ? 'تكملة الورد من الحصة السابقة' : undefined;

        goals.push({
          id: seededId(rng, 'goal'),
          studentId: student.id,
          type: cfg.type,
          unit: cfg.unit,
          targetAmount: cfg.target,
          achievedAmount,
          periodType: 'week',
          periodLabel: label,
          startDate: startISO,
          endDate: endISO,
          teacherName: TEACHER_FOR_TYPE[cfg.type],
          rangeDescription,
          notes,
          createdAt: startISO,
          updatedAt: isCurrent ? startISO : endISO,
        });
      });
    });
  }

  // ---------- أهداف شهرية (لعينة من التلاميذ المتقدمين) ----------
  const monthlyStudents = students.filter((s) => ['عبد الرحمن الفاسي', 'مريم الإدريسي'].includes(s.fullName));
  for (let m = NUM_PAST_MONTHS; m >= 0; m--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const { start, end } = getMonthRange(anchor);
    const startISO = toISODate(start);
    const endISO = toISODate(end);
    const label = buildPeriodLabel('month', startISO, endISO);
    const isCurrent = m === 0;

    monthlyStudents.forEach((student) => {
      const target = 4; // هدف شهري: مراجعة شاملة لأربعة أحزاب
      let achievedAmount: number | null = null;
      let notes: string | undefined;
      if (!isCurrent) {
        const { ratio, bucket } = rollAchievementRatio(rng, 0.8);
        achievedAmount = Math.max(0, roundToStep(target * ratio, 0.25));
        notes = pickNote(rng, bucket);
      }
      goals.push({
        id: seededId(rng, 'goal'),
        studentId: student.id,
        type: 'murajaa',
        unit: 'hizb',
        targetAmount: target,
        achievedAmount,
        periodType: 'month',
        periodLabel: label,
        startDate: startISO,
        endDate: endISO,
        teacherName: TEACHER_FOR_TYPE.murajaa,
        rangeDescription: 'مراجعة شاملة للمحفوظ خلال الشهر',
        notes,
        createdAt: startISO,
        updatedAt: isCurrent ? startISO : endISO,
      });
    });
  }

  // ---------- فترة مخصصة تجريبية: الدورة الصيفية ----------
  {
    const customStart = addDays(now, -63);
    const customEnd = addDays(now, -42);
    const startISO = toISODate(customStart);
    const endISO = toISODate(customEnd);
    const label = buildPeriodLabel('custom', startISO, endISO);
    students
      .filter((s) => s.active)
      .slice(0, 4)
      .forEach((student) => {
        const target = randInt(rng, 3, 6);
        const { ratio, bucket } = rollAchievementRatio(rng, 0.75);
        goals.push({
          id: seededId(rng, 'goal'),
          studentId: student.id,
          type: 'hifz',
          unit: 'hizb',
          targetAmount: target,
          achievedAmount: Math.max(0, roundToStep(target * ratio, 0.25)),
          periodType: 'custom',
          periodLabel: label,
          startDate: startISO,
          endDate: endISO,
          teacherName: TEACHER_FOR_TYPE.hifz,
          rangeDescription: 'ضمن الدورة الصيفية 2026',
          notes: pickNote(rng, bucket),
          createdAt: startISO,
          updatedAt: endISO,
        });
      });
  }

  // ---------- سجل الحفظ (تسجيلات سورة/آية/تاريخ) ----------
  students.forEach((student, idx) => {
    const sSeed = STUDENT_SEEDS[idx];
    const [minS, maxS] = surahRangeForLevel(sSeed.level);
    const recordsCount = randInt(rng, 4, 8);
    for (let r = 0; r < recordsCount; r++) {
      const surahId = randInt(rng, minS, maxS);
      const surah = SURAHS[surahId - 1];
      let startVerse = 1;
      let endVerse = surah.versesCount;
      if (surah.versesCount > 15) {
        startVerse = randInt(rng, 1, Math.max(1, surah.versesCount - 5));
        endVerse = Math.min(surah.versesCount, startVerse + randInt(rng, 3, 20));
      } else if (!chance(rng, 0.8)) {
        startVerse = randInt(rng, 1, surah.versesCount);
        endVerse = randInt(rng, startVerse, surah.versesCount);
      }
      const daysAgo = randInt(rng, 0, Math.min(sSeed.joinDaysAgo, 70));
      const date = toISODate(addDays(now, -daysAgo));
      const note = randChoice(rng, MEMORIZATION_NOTES);
      memorizationRecords.push({
        id: seededId(rng, 'mem'),
        studentId: student.id,
        surahId,
        startVerse,
        endVerse,
        date,
        notes: note || undefined,
        createdAt: date,
      });
    }
  });

  memorizationRecords.sort((a, b) => (a.date < b.date ? 1 : -1));

  return { students, goals, memorizationRecords };
}

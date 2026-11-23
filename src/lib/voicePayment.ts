import { addDays, parseISODate, toISODate } from './dates.ts';

const MONTHS = [
  'يناير|جانفي|janvier|yanayir', 'فبراير|فيفري|fevrier|fibrayir', 'مارس|mars|maris', 'ابريل|افريل|avril|abril',
  'ماي|مايو|mai|may', 'يونيو|جوان|juin|yunyu', 'يوليوز|يوليو|جويلية|juillet|yulyuz', 'غشت|اغسطس|اوت|aout|ghusht',
  'شتنبر|سبتمبر|septembre|shutanbir', 'اكتوبر|octobre|oktobr|oktober', 'نونبر|نوفمبر|novembre|nwanbir', 'دجنبر|ديسمبر|decembre|dujanbir',
].map((month) => month.split('|'));

const AMOUNTS: Record<string, number> = {
  واحد: 1, اثنان: 2, اثنين: 2, ثلاثة: 3, اربعة: 4, خمسة: 5, ستة: 6, سبعة: 7, ثمانية: 8, تسعة: 9, عشرة: 10,
  عشرون: 20, عشرين: 20, ثلاثون: 30, ثلاثين: 30, اربعون: 40, اربعين: 40,
  خمسون: 50, خمسين: 50, ستون: 60, ستين: 60, سبعون: 70, سبعين: 70,
  ثمانون: 80, ثمانين: 80, تسعون: 90, تسعين: 90, مئة: 100, مائة: 100, الف: 1000,
};

const DATE_NUMBERS: Record<string, number> = {
  ...AMOUNTS,
  وحد: 1, wahed: 1, wahd: 1, جوج: 2, تلاتة: 3, tileta: 3, tlata: 3, ربعة: 4,
  ستا: 6, ست: 6, sta: 6, setta: 6, sitta: 6,
  حداش: 11, احداش: 11, hdach: 11, hdas: 11, طناش: 12, تلطاش: 13, ربعطاش: 14, خمسطاش: 15,
  سطاش: 16, سبعطاش: 17, تمنطاش: 18, تسعطاش: 19,
  ichrine: 20, ichrin: 20, '3ichrin': 20, '3ichrine': 20, تلاتين: 30,
};
const ATTENDANCE_STATUS = 'غايب(?:ا)?|غاب|ghaib|ghayb|ghayeb|حاضر(?:ا)?|حضر';
const ATTENDANCE_NEGATION = 'ما ?كان ?ش|مكانش|مكنش|ماشي|مش|ma ?kan ?ch|ma ?kan ?sh|machi';
const ATTENDANCE_DAY_MARKER = 'يوم|نهار|yaoum|nhar|بتاريخ';
const ATTENDANCE_COMMAND = new RegExp(`^سجل (?:غياب|حضور)(?: |$)|(?:^| )(?:${ATTENDANCE_STATUS})(?: |$)`, 'u');
const ARABIC_NAME_LETTERS: Record<string, string> = {
  ا: 'a', ب: 'b', ت: 't', ث: 't', ج: 'j', ح: 'h', خ: 'x', د: 'd', ذ: 'd',
  ر: 'r', ز: 'z', س: 's', ش: 'c', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: '3',
  غ: 'v', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'a',
  و: 'w', ي: 'y',
};

function normalize(text: string) {
  return text.toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ـ/g, '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16))
    .replace(/[،,!?؟؛:«»"。]/g, ' ').replace(/[.]+$/g, '').trim().replace(/\s+/g, ' ');
}

function transliteratedNameKey(name: string) {
  const consonants = name.replace(/gh/g, 'v').replace(/kh/g, 'x').replace(/(?:ch|sh)/g, 'c')
    .replace(/\p{Script=Arabic}/gu, (letter) => ARABIC_NAME_LETTERS[letter] ?? '');
  return consonants.split(' ').map((word) => word
    .replace(/[^a-z3]/g, '').replace(/[aeiou]/g, '').replace(/(?!^)[wy]/g, '')
    .replace(/(.)\1+/g, '$1')).join('');
}

export function parseVoiceConfirmation(text: string): 'yes' | 'no' | undefined {
  const answer = normalize(text);
  if (/^(?:نعم|ايه|واخا|ايوه|اجل|اكد|نعم اكد|نعم سجل|oui)$/.test(answer)) return 'yes';
  if (/^(?:لا|لا شكرا|الغ|الغاء|ما تسجلش|non)$/.test(answer)) return 'no';
}

export type VoicePayment = { studentId: string; name: string; studentNumber: number; amount: number; period: string };
type Candidate = { id: string; fullName: string; studentNumber: number; active: boolean };

export function parseVoiceCommand(text: string, students: readonly Candidate[], today = new Date()) {
  const normalized = normalize(text);
  if (ATTENDANCE_COMMAND.test(normalized)) {
    return parseVoiceAttendance(text, students, today);
  }
  if (/(?:^| )(?:ادي|دفع|خلص|سدد|درهم(?:ا)?|دراهم)(?: |$)/u.test(normalized)) {
    return parseVoicePayment(text, students, today);
  }
  return 'لم أفهم الإجراء المطلوب. يمكنك طلب تسجيل حضور أو غياب أو أداء.';
}

export function reviewVoiceTranscripts(
  transcripts: readonly string[], students: readonly Candidate[], today = new Date(),
): { text: string; result: VoiceAttendance | VoicePayment | string } {
  const text = transcripts[0] ?? '';
  const first = parseVoiceCommand(text, students, today);
  let match = typeof first === 'string' ? undefined : { text, result: first };
  for (const alternative of transcripts.slice(1)) {
    const result = parseVoiceCommand(alternative, students, today);
    if (typeof result === 'string') continue;
    if (match && JSON.stringify(match.result) !== JSON.stringify(result)) {
      return { text, result: 'سمعت أكثر من احتمال. أعد نطق الاسم الكامل والتاريخ أو المبلغ بوضوح.' };
    }
    match ??= { text: alternative, result };
  }
  return match ?? { text, result: first };
}

export function combineVoiceSegments(segments: readonly (readonly string[])[]): string[] {
  const limit = 16;
  let combinations = [{ text: '', rank: 0 }];
  for (const alternatives of segments) {
    combinations = combinations.flatMap(({ text, rank }) =>
      alternatives.map((alternative, index) => ({ text: `${text} ${alternative}`.trim(), rank: rank + index })),
    ).sort((a, b) => a.rank - b.rank).slice(0, limit);
  }
  return [...new Set(combinations.map(({ text }) => text).filter(Boolean))];
}

function findStudent(name: string, students: readonly Candidate[]) {
  const normalized = normalize(name);
  let matches = students.filter((student) => student.active && normalize(student.fullName) === normalized);
  if (!matches.length && /^[a-z3]+(?:[ -][a-z3]+)+$/.test(normalized)) {
    const key = transliteratedNameKey(normalized);
    if (key.length >= 4) matches = students.filter((student) => student.active
      && /\p{Script=Arabic}/u.test(student.fullName)
      && transliteratedNameKey(normalize(student.fullName)) === key);
  }
  if (matches.length === 0) return 'لم أجد تلميذًا نشطًا بهذا الاسم. أعد نطق الاسم الكامل.';
  if (matches.length > 1) return 'يوجد أكثر من تلميذ بهذا الاسم. سجّل العملية من الصفحة المخصّصة لها.';
  const { id: studentId, fullName, studentNumber } = matches[0];
  return { studentId, name: fullName, studentNumber };
}

export type VoiceAttendance = {
  studentId: string; name: string; studentNumber: number; date: string; status: 'absent' | 'present';
};

export function parseVoiceAttendance(
  text: string, students: readonly Candidate[], today = new Date(),
): VoiceAttendance | string {
  const normalized = normalize(text);
  const dateSuffix = '(?: (?<spoken>.+))?$';
  const command = normalized.match(new RegExp(
    `^(?:سجل (?:التلميذ )?)?(?<name>.+?) (?:(?<negative>${ATTENDANCE_NEGATION}) |راه |كان |est )?(?<status>${ATTENDANCE_STATUS})` + dateSuffix, 'u',
  ));
  // In the imperative form, split the student name only at an explicit date marker.
  const alternateSuffix = `(?: (?<spoken>(?:في )?(?:${ATTENDANCE_DAY_MARKER})(?: .+)?|اليوم|(?:ب)?الامس|امس|البارح(?:ة)?|hier|\\d+ *[./-] *\\d+ *[./-] *\\d+))?$`;
  const alternate = normalized.match(new RegExp('^سجل (?<status>غياب|حضور) (?:التلميذ )?(?<name>.+?)' + alternateSuffix, 'u'));
  const details = command?.groups ?? alternate?.groups;
  if (!details) return 'اذكر الاسم الكامل وحالة الحضور. مثال: سجّل غياب يوسف العلوي اليوم.';
  const day = details.spoken?.replace(new RegExp(`^(?:(?:في )?(?:${ATTENDANCE_DAY_MARKER})(?: |$))+`, 'u'), '');
  const numeric = day?.match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})$/);
  const date = day === undefined || day === 'اليوم' ? toISODate(today)
    : /^(?:امس|(?:ب)?الامس|البارح(?:ة)?|hier)$/.test(day) ? toISODate(addDays(today, -1))
    : /^\d{4}-\d{2}-\d{2}$/.test(day) ? day
    : numeric ? `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`
    : parseSpokenDate(day);
  if (!date || date !== toISODate(parseISODate(date)) || date > toISODate(today)) return 'تحقّق من تاريخ الحضور.';
  const student = findStudent(details.name, students);
  if (typeof student === 'string') return student;
  const absent = /^(?:غ|gh)/.test(details.status) !== Boolean(details.negative);
  return { ...student, date, status: absent ? 'absent' : 'present' };
}

function parseSpokenNumber(text: string): number {
  if (/^\d+$/.test(text)) return Number(text);
  if (Object.hasOwn(DATE_NUMBERS, text)) return DATE_NUMBERS[text];
  const parts = text.match(/^([\p{L}\d]+?)\s*(?:و\s*| (?:wa|w|o|ou) )([\p{L}\d]+)$/u);
  if (!parts) return NaN;
  const unit = DATE_NUMBERS[parts[1]];
  const tens = DATE_NUMBERS[parts[2]];
  return unit >= 1 && unit <= 9 && tens >= 20 && tens <= 90 && tens % 10 === 0
    ? unit + tens : NaN;
}

function parseYear(text: string): number {
  if (/^\d{4}$/.test(text)) return Number(text);
  const spoken = text.match(/^(?:الف )?(?:الفين|الفان|alfine|alfayn|alfain)(?:(?:\s*و\s*| (?:wa|w|o|ou) | )(.+))?$/u);
  return spoken ? 2000 + (spoken[1] ? parseSpokenNumber(spoken[1]) : 0) : NaN;
}

function parseSpokenDate(text: string): string {
  const words = text.split(' ');
  for (let index = 1; index < words.length - 1; index += 1) {
    const namedMonth = MONTHS.findIndex((aliases) => aliases.includes(words[index])) + 1;
    const month = namedMonth || parseSpokenNumber(words[index]);
    if (!(month >= 1 && month <= 12)) continue;
    const day = parseSpokenNumber(words.slice(0, index).join(' '));
    const year = parseYear(words.slice(index + 1).join(' ').replace(/^(?:سنة|عام) /, ''));
    if (day >= 1 && day <= 31 && year >= 2000 && year <= 2099) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

export function parseVoicePayment(
  text: string, students: readonly Candidate[], today = new Date(),
): VoicePayment | string {
  const normalized = normalize(text);
  const command = normalized.match(/^(?<name>.+?) (?:ادي|دفع|خلص|سدد) (?<details>.+)$/u);
  const details = command?.groups?.details.match(/^(?<amount>.+?) (?:درهما?|دراهم) (?<period>.+)$/u)?.groups;
  if (!details) return 'اذكر اسم التلميذ والمبلغ بالدرهم وشهر الأداء. مثال: يحيى رواي أدّى خمسين درهمًا في شهر يناير ٢٠٢٧.';

  const amountText = details.amount.replace('٫', '.');
  const amount = /^\d+(?:\.\d{1,2})?$/.test(amountText)
    ? Number(amountText) : parseSpokenNumber(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 100_000_000) return 'لم أفهم المبلغ. أعد نطقه بوضوح.';

  const periodText = details.period.replace(/^(?:في |عن |ديال |de )/u, '')
    .replace(/^لل/u, 'ال').replace(/^ل ?(?=شهر|الشهر)/u, '');
  const relative = periodText.match(/^(?:ال)?شهر (الحالي|الجاري|المقبل|القادم|الجاي)$/u);
  let period: string;
  if (relative || /^(?:هذا|هاد) الشهر$/u.test(periodText)) {
    const next = /^(?:المقبل|القادم|الجاي)$/.test(relative?.[1] ?? '');
    period = toISODate(new Date(today.getFullYear(), today.getMonth() + Number(next), 1)).slice(0, 7);
  } else {
    const absolute = periodText.match(/^(?:شهر )?(?:de )?(?<month>\p{L}+)(?: (?:سنة |عام )?(?<year>.+))?$/u)?.groups;
    const month = MONTHS.findIndex((aliases) => aliases.includes(absolute?.month ?? ''));
    if (month < 0) return 'لم أفهم شهر الأداء. اذكر اسم الشهر بوضوح.';
    const year = absolute?.year ? parseYear(absolute.year) : today.getFullYear() + Number(month < today.getMonth());
    if (!Number.isInteger(year) || year < 2000 || year > 2099) return 'تحقّق من سنة الأداء.';
    period = `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  const student = findStudent(command?.groups?.name ?? '', students);
  if (typeof student === 'string') return student;
  return {
    ...student,
    amount,
    period,
  };
}

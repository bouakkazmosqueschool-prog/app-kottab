import assert from 'node:assert/strict';
import test from 'node:test';
import { combineVoiceSegments, parseVoiceCommand, parseVoiceConfirmation, reviewVoiceTranscripts } from '../src/lib/voicePayment.ts';

const today = new Date(2026, 10, 22);
const students = [
  { id: 'student-1', studentNumber: 1, fullName: 'يحيى المثال', active: true },
  { id: 'student-2', studentNumber: 2, fullName: 'يوسف المثال', active: true },
];
const absence = {
  studentId: 'student-1', studentNumber: 1, name: 'يحيى المثال', date: '2026-11-21', status: 'absent',
};

test('recognizes Darija dates and mixed French month names', () => {
  for (const text of [
    'يحيى المثال غائب يوم يوم واحد وعشرين نوفمبر ألفين وستة وعشرين',
    'يحيى المثال راه غايب نهار واحد و عشرين novembre ألفين و ستا و عشرين',
    'يحيى المثال est ghaib yaoum wahed wa ichrine novembre alfine wa sta wa ichrine',
    'سجل غياب التلميذ يحيى المثال يوم ٢١ نونبر ٢٠٢٦',
    'يحيى المثال غاب 2026-11-21',
  ]) {
    assert.deepEqual(parseVoiceCommand(text, students, today), absence, text);
  }
});

test('uses a usable speech alternative and flags conflicting interpretations', () => {
  const bad = 'يا يا المثال يوم يوم';
  const good = 'يحيى المثال غائب يوم واحد وعشرين نوفمبر ألفين وستة وعشرين';
  assert.deepEqual(reviewVoiceTranscripts([bad, good], students, today), { text: good, result: absence });
  const conflict = reviewVoiceTranscripts([bad, good, good.replace('يحيى', 'يوسف')], students, today);
  assert.equal(conflict.text, bad);
  assert.equal(typeof conflict.result, 'string');
  assert.equal(typeof reviewVoiceTranscripts([bad], students, today).result, 'string');
});

test('rejects a missing explicit date, impossible dates and future attendance', () => {
  for (const text of ['يوم', 'يوم 31 novembre 2026', '2026-11-23']) {
    assert.equal(typeof parseVoiceCommand(`يحيى المثال غائب ${text}`, students, today), 'string');
  }
  assert.deepEqual(parseVoiceCommand('سجل غياب يحيى المثال البارح', students, today), absence);
});

test('continues to parse financial commands', () => {
  assert.deepEqual(parseVoiceCommand('يحيى المثال أدى خمسين درهم في شهر novembre 2026', students, today), {
    studentId: 'student-1', studentNumber: 1, name: 'يحيى المثال', amount: 50, period: '2026-11',
  });
});

test('recovers when two speech segments need alternatives', () => {
  const variants = combineVoiceSegments([
    ['يا يا المثال', 'يحيى المثال'],
    ['غائب يوم واحد وعشرين المبلغ', 'غائب يوم واحد وعشرين نوفمبر ألفين وستة وعشرين'],
  ]);
  assert.equal(variants[0], 'يا يا المثال غائب يوم واحد وعشرين المبلغ');
  assert.deepEqual(reviewVoiceTranscripts(variants, students, today).result, absence);
});

test('explicit student selection reuses a valid date, never an invalid one', () => {
  const spoken = 'يا يا المثال غائب يوم يوم واحد وعشرين نوفمبر ألفين وستة وعشرين';
  assert.equal(typeof parseVoiceCommand(spoken, students, today), 'string');
  assert.deepEqual(parseVoiceCommand(spoken, students, today, 'student-1'), absence);
  assert.deepEqual(parseVoiceCommand('غائب يوم 2026-11-21', students, today, 'student-1'), absence);
  assert.equal(typeof parseVoiceCommand('غائب يوم 2026-11-23', students, today, 'student-1'), 'string');
  assert.equal(typeof parseVoiceCommand(spoken, students, today, 'out-of-scope-student'), 'string');
  assert.deepEqual(parseVoiceCommand('خلص خمسين درهم عن نونبر 2026', students, today, 'student-1'), {
    studentId: 'student-1', studentNumber: 1, name: 'يحيى المثال', amount: 50, period: '2026-11',
  });
});

test('accepts yesterday and Moroccan numeric attendance dates', () => {
  const nextDay = new Date(2026, 10, 23);
  const yesterday = { ...absence, date: '2026-11-22' };
  assert.deepEqual(parseVoiceCommand('يحيى المثال كان غائبا بالأمس', students, nextDay), yesterday);
  assert.deepEqual(parseVoiceCommand('سجل غياب يحيى المثال ٢٢.١١.٢٠٢٦', students, nextDay), yesterday);
  assert.deepEqual(parseVoiceCommand('يحيى المثال حضر بتاريخ 22.11 .2026', students, nextDay), {
    ...yesterday, status: 'present',
  });
  assert.equal(typeof parseVoiceCommand('يحيى المثال غاب 31.11.2026', students, nextDay), 'string');
});

test('understands this month and next month, including December rollover', () => {
  const december = new Date(2026, 11, 31);
  const payment = { studentId: 'student-1', studentNumber: 1, name: 'يحيى المثال', amount: 50, period: '2026-12' };
  assert.deepEqual(parseVoiceCommand('يحيى المثال خلص خمسين درهم هاد الشهر', students, december), payment);
  assert.deepEqual(parseVoiceCommand('يحيى المثال دفع ٥٠ درهما للشهر الجاري', students, december), payment);
  assert.deepEqual(parseVoiceCommand('يحيى المثال أدى 50 درهم للشهر المقبل', students, december), {
    ...payment, period: '2027-01',
  });
});

test('only standalone affirmative replies confirm a draft', () => {
  for (const text of ['نعم.', 'واخا', 'أجل', 'oui']) assert.equal(parseVoiceConfirmation(text), 'yes');
  for (const text of ['لا', 'لا، شكرا', 'non']) assert.equal(parseVoiceConfirmation(text), 'no');
  for (const text of ['', 'نعم لا', 'لا تسجل نعم', 'يحيى المثال غائب']) assert.equal(parseVoiceConfirmation(text), undefined);
});

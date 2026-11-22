import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVoiceCommand, reviewVoiceTranscripts } from '../src/lib/voicePayment.ts';

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

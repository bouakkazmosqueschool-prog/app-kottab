import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { MONTHS_MA } from '../../lib/dates';
import { combineVoiceSegments, parseVoiceConfirmation, reviewVoiceTranscripts, type VoiceAttendance, type VoicePayment } from '../../lib/voicePayment';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { usePaymentsStore } from '../../store/paymentsStore';
import { useStudentsStore } from '../../store/studentsStore';
import { toast } from '../../store/toastStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Primitives';
import { SearchSelect } from '../ui/SearchSelect';

type Recognition = {
  lang: string;
  maxAlternatives: number;
  onaudiostart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

const INVITATION = 'تفضّل، ماذا يمكنني أن أفعل لك؟';
const COMMAND_PLACEHOLDER = 'اطلب إجراءً، مثل تسجيل غياب أو أداء';
const CONFIRMATION_PROMPT = 'هل تريد التسجيل؟ قل «نعم» للتأكيد أو «لا» للإلغاء.';
const arabicNumber = new Intl.NumberFormat('ar', { numberingSystem: 'arab' });

function stopRecognition(recognition: Recognition) {
  recognition.onresult = recognition.onerror = recognition.onend = null;
  recognition.onaudiostart = null;
  recognition.abort();
}

export function VoicePaymentDialog({ onClose }: { onClose: () => void }) {
  const session = useAuthStore((state) => state.session);
  const students = useStudentsStore((state) => state.students);
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<VoicePayment | VoiceAttendance | null>(null);
  const [error, setError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [phase, setPhase] = useState<'prompt' | 'starting' | 'listening' | 'processing' | 'idle' | 'saving'>('prompt');
  const recording = useRef<Recognition | null>(null);
  const recognitionTimer = useRef<number | undefined>(undefined);
  const saving = useRef(false);
  const speechTranscripts = useRef<string[]>([]);
  const studentOptions = useMemo(() => students.filter((student) => student.active).map((student) => ({
    value: student.id, label: `${student.fullName} · #${student.studentNumber}`,
  })), [students]);
  const browser = window as SpeechWindow;
  const RecognitionApi = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;

  function review(text: string, transcripts = [text], studentId = selectedStudentId) {
    const interpretation = reviewVoiceTranscripts(transcripts, useStudentsStore.getState().students, new Date(), studentId);
    setTranscript(interpretation.text);
    const { result } = interpretation;
    if (typeof result === 'string') {
      setDraft(null);
      setError(result);
      return null;
    }
    const isPayment = 'period' in result;
    const allowed = session && isPayment === (session.role === 'supervisor');
    setDraft(allowed ? result : null);
    setError(allowed ? '' : isPayment
      ? 'تسجيل الأداءات متاح للمشرف المالي.'
      : 'تسجيل الحضور والغياب متاح للأستاذ والمدير العام.');
    return allowed ? result : null;
  }

  function listen(confirmationDraft?: VoicePayment | VoiceAttendance) {
    if (!RecognitionApi || recording.current) return;
    const recognition = new RecognitionApi();
    recognition.lang = 'ar-MA';
    recognition.maxAlternatives = confirmationDraft ? 1 : 5;
    let answer = '';
    setAwaitingConfirmation(!!confirmationDraft);
    if (!confirmationDraft) {
      speechTranscripts.current = [];
      setSelectedStudentId('');
    }
    const finish = () => {
      if (recording.current !== recognition) return;
      window.clearTimeout(recognitionTimer.current);
      recording.current = null;
      setAwaitingConfirmation(false);
      setPhase('idle');
    };
    recognition.onresult = ({ results }) => {
      if (recording.current !== recognition) return;
      const parts = Array.from(results, (result) =>
        Array.from(result, (alternative) => alternative.transcript.trim()).filter(Boolean),
      ).filter((alternatives) => alternatives.length);
      const transcripts = combineVoiceSegments(parts);
      const [text] = transcripts;
      if (!text) return;
      if (confirmationDraft) {
        answer = text;
        return;
      }
      speechTranscripts.current = transcripts;
      setTranscript(text);
    };
    recognition.onaudiostart = () => {
      if (recording.current !== recognition) return;
      window.clearTimeout(recognitionTimer.current);
      setPhase('listening');
      recognitionTimer.current = window.setTimeout(stopListening, confirmationDraft ? 10000 : 25000);
    };
    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'لم يسمح المتصفح باستخدام الميكروفون. تحقّق من الإذن أو اكتب الأمر.'
        : 'تعذّر التعرّف على الكلام. أعد المحاولة أو اكتب الأمر.');
      finish();
    };
    recognition.onend = () => {
      if (recording.current !== recognition) return;
      finish();
      if (confirmationDraft) {
        const decision = parseVoiceConfirmation(answer);
        if (decision === 'yes') void confirm(confirmationDraft);
        else if (decision === 'no') onClose();
        else setError('لم أفهم التأكيد. قل «نعم» أو «لا»، أو استخدم زر التأكيد.');
        return;
      }
      const transcripts = speechTranscripts.current;
      if (!transcripts.length) {
        setError('لم يصل نصّ من الميكروفون. تحقّق من الميكروفون المحدّد في المتصفح أو اكتب الأمر.');
        return;
      }
      const pending = review(transcripts[0], transcripts, '');
      if (pending) listen(pending);
    };
    recording.current = recognition;
    setError('');
    setPhase('starting');
    try {
      recognitionTimer.current = window.setTimeout(stopListening, 120000);
      recognition.start();
    } catch {
      finish();
      setError('تعذّر تشغيل الميكروفون. أعد المحاولة أو اكتب الأمر.');
    }
  }

  function stopListening() {
    const recognition = recording.current;
    if (!recognition) return;
    window.clearTimeout(recognitionTimer.current);
    setPhase('processing');
    const recover = () => {
      if (recording.current !== recognition) return;
      window.clearTimeout(recognitionTimer.current);
      stopRecognition(recognition);
      recording.current = null;
      setAwaitingConfirmation(false);
      setPhase('idle');
      setError('لم يصل نصّ من الميكروفون. أعد المحاولة أو اكتب الأمر.');
    };
    recognitionTimer.current = window.setTimeout(recover, 45000);
    try {
      recognition.stop();
    } catch {
      recover();
    }
  }

  const beginListening = useRef(listen);
  useEffect(() => {
    let active = true;
    const speech = window.speechSynthesis;
    let utterance: SpeechSynthesisUtterance | undefined;
    const start = () => {
      if (active) beginListening.current();
    };
    const timer = window.setTimeout(() => {
      if (!session || !RecognitionApi) {
        setPhase('idle');
        return;
      }
      const voice = speech?.getVoices().find(({ lang }) => /^ar(?:-|$)/i.test(lang));
      if (!voice) {
        start();
        return;
      }
      utterance = new SpeechSynthesisUtterance(INVITATION);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.onend = start;
      utterance.onerror = start;
      speech.speak(utterance);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(recognitionTimer.current);
      if (utterance) speech.cancel();
      if (recording.current) {
        stopRecognition(recording.current);
        recording.current = null;
      }
    };
  }, [RecognitionApi, session]);

  async function confirm(pending: VoicePayment | VoiceAttendance) {
    const current = useAuthStore.getState().session;
    if (recording.current || saving.current || !current || current.teacherId !== session?.teacherId) return;
    const isPayment = 'period' in pending;
    if (isPayment !== (current.role === 'supervisor')) return;
    if (isPayment && usePaymentsStore.getState().payments.some(
      (payment) => payment.studentId === pending.studentId && payment.period === pending.period,
    )) {
      setError('يوجد أداء مسجّل لهذا التلميذ في هذا الشهر.');
      return;
    }
    saving.current = true;
    setPhase('saving');
    setError('');
    try {
      const saved = isPayment
        ? await usePaymentsStore.getState().setPayment(pending.studentId, pending.period, pending.amount, 'insert')
        : await useAttendanceStore.getState().setStatus(pending.studentId, pending.date, pending.status);
      if (saved) {
        toast.success(isPayment ? 'تم تسجيل الأداء بنجاح' : 'تم تسجيل حالة الحضور بنجاح');
        onClose();
      } else {
        setError(isPayment ? 'تعذّر تسجيل الأداء. قد يكون لهذا التلميذ أداء مسجّل في هذا الشهر.' : 'تعذّر تسجيل حالة الحضور.');
      }
    } catch {
      setError('تعذّر الاتصال بالخادم. تحقّق من السجل قبل إعادة المحاولة.');
    } finally {
      saving.current = false;
      setPhase('idle');
    }
  }

  const payment = draft && 'period' in draft ? draft : null;
  const attendance = draft && 'date' in draft ? draft : null;
  const [year, month] = (payment?.period ?? attendance?.date)?.split('-').map(Number) ?? [];
  const canEdit = phase === 'idle';
  return (
    <Modal open title="الأوامر الصوتية" onClose={() => { if (!saving.current) onClose(); }}
      footer={
        <>
          <Button type="button" variant="ghost" disabled={phase === 'saving'} onClick={onClose}>إلغاء</Button>
          {draft && <Button type="button" disabled={!canEdit} onClick={() => void confirm(draft)}>
            {phase === 'saving' ? 'جارٍ التسجيل…' : payment ? 'تأكيد تسجيل الأداء' : 'تأكيد تسجيل حالة الحضور'}
          </Button>}
        </>
      }>
        <div className="flex flex-col gap-4" dir="rtl" lang="ar">
          <p role="status" className="font-semibold text-ink">
            {awaitingConfirmation ? CONFIRMATION_PROMPT
              : phase === 'listening' ? 'أستمع إليك…' : phase === 'processing' ? 'جارٍ تحويل الكلام إلى نص…' : INVITATION}
            {phase === 'starting' && ' جارٍ تهيئة الميكروفون…'}
          </p>
          {!RecognitionApi && <p className="text-sm text-ink-soft">التعرّف على الصوت غير متاح في هذا المتصفح. يمكنك كتابة الأمر أدناه.</p>}
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            الأمر
            <textarea value={transcript} disabled={!canEdit} placeholder={COMMAND_PLACEHOLDER} maxLength={300} rows={2}
              className="resize-y rounded-xl border border-line bg-paper px-3 py-2 text-ink"
              onChange={(event) => {
                setTranscript(event.target.value);
                speechTranscripts.current = [];
                setDraft(null);
                setError('');
              }} />
          </label>
          {canEdit && transcript.trim() && (error || selectedStudentId) && (
            <div className="flex flex-col gap-1 text-sm font-medium text-ink">
              <span>اختيار التلميذ يدويًا</span>
              <SearchSelect value={selectedStudentId} options={studentOptions} placeholder="اختر التلميذ"
                onChange={(id) => {
                  setSelectedStudentId(id);
                  const alternatives = speechTranscripts.current;
                  review(transcript, alternatives.length ? alternatives : [transcript], id);
                }} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {phase === 'listening' ? <Button type="button" onClick={stopListening}>إنهاء الاستماع</Button>
            : RecognitionApi && <Button type="button" variant="secondary" disabled={!canEdit}
              icon={<Mic aria-hidden="true" className="size-4" />} onClick={() => { setDraft(null); listen(); }}>
              إعادة الاستماع
            </Button>}
            <Button type="button" variant="secondary" disabled={!canEdit || !transcript.trim()} onClick={() => review(transcript)}>
              مراجعة الأمر
            </Button>
            {draft && RecognitionApi && canEdit && (
              <Button type="button" variant="secondary" onClick={() => listen(draft)}>التأكيد بالصوت</Button>
            )}
          </div>
          {draft && (
            <section aria-live="polite" className="rounded-xl border border-line bg-cream p-4 text-ink">
              <h4 className="font-bold">{payment ? 'تسجيل أداء جديد' : 'تسجيل حالة الحضور'}</h4>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt>التلميذ</dt><dd>{draft.name} · {arabicNumber.format(draft.studentNumber)}</dd>
                {payment && <><dt>المبلغ</dt><dd>{arabicNumber.format(payment.amount)} درهمًا</dd></>}
                {attendance && <><dt>الحالة</dt><dd>{attendance.status === 'absent' ? 'غائب' : 'حاضر'}</dd></>}
                <dt>{payment ? 'الشهر' : 'التاريخ'}</dt>
                <dd>{attendance && `${arabicNumber.format(Number(attendance.date.slice(-2)))} `}{MONTHS_MA[month - 1]} {arabicNumber.format(year)}</dd>
              </dl>
            </section>
          )}
          {error && <p role="alert" className="text-sm text-clay">{error}</p>}
        </div>
    </Modal>
  );
}

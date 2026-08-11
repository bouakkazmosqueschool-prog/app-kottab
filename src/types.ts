/**
 * Types de domaine de l'application Kuttab.
 *
 * Ces types définissent le "contrat" de données de l'application.
 * Ils sont volontairement indépendants de la couche de stockage
 * (voir src/store) afin qu'on puisse remplacer localStorage par
 * Firebase/Firestore sans changer l'UI. Voir README.md.
 */

/** Type d'objectif demandé à un(e) élève — correspond aussi à la حلقة de l'enseignant */
export type GoalType = 'hifz' | 'murajaa' | 'alwah';

/** Une حلقة correspond exactement à un type de travail (حفظ / مراجعة / ألواح) */
export type Halqa = GoalType;

/** Unité de mesure d'un objectif */
export type GoalUnit = 'aya' | 'thumn' | 'rub' | 'nisf' | 'hizb';

/** Type de période de suivi */
export type PeriodType = 'week' | 'month' | 'custom';

/** État d'avancement calculé automatiquement (jamais stocké tel quel) */
export type GoalStatus =
  | 'pending' // لم يُسجَّل بعد (المنجز غير مدخل)
  | 'incomplete' // غير تام (المنجز < المطلوب)
  | 'completed' // تم (المنجز = المطلوب)
  | 'completed_plus'; // تم بزيادة (المنجز > المطلوب)

/** Note d'évaluation calculée automatiquement à partir du pourcentage */
export type EvaluationGrade = 'ممتاز' | 'جيد جدًا' | 'جيد' | 'مقبول' | 'ضعيف';

/** Compte enseignant (authentification simple, données de démonstration) */
export interface Teacher {
  id: string;
  name: string;
  password: string;
}

/** Session active : enseignant connecté + حلقة choisie pour cette session */
export interface AuthSession {
  teacherId: string;
  teacherName: string;
  halqa: Halqa;
}

export interface Student {
  id: string;
  fullName: string;
  level: string;
  guardianPhone?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  joinDate: string; // ISO yyyy-mm-dd
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  studentId: string;
  type: GoalType;
  unit: GoalUnit;
  targetAmount: number;
  /** null tant que l'enseignant n'a pas encore saisi le réalisé */
  achievedAmount: number | null;
  periodType: PeriodType;
  periodLabel: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  /** Nom de l'enseignant qui a créé/saisi cet objectif (تتبع الأستاذ) */
  teacherName?: string;
  /** Description libre optionnelle (ex: "من سورة البقرة إلى آل عمران") */
  rangeDescription?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemorizationRecord {
  id: string;
  studentId: string;
  surahId: number; // 1..114
  startVerse: number;
  endVerse: number;
  date: string; // ISO yyyy-mm-dd
  notes?: string;
  createdAt: string;
}

export type Revelation = 'meccan' | 'medinan';

export interface Surah {
  id: number; // 1..114
  name: string; // اسم السورة بالعربية
  transliteration: string;
  versesCount: number;
  revelation: Revelation;
}

export interface AppSettings {
  schoolName: string;
  teacherName: string;
  defaultPeriodType: PeriodType;
  darkMode: boolean;
}

/** Enveloppe utilisée pour l'export/import global des données (Paramètres) */
export interface DataBundle {
  version: 1;
  exportedAt: string;
  students: Student[];
  goals: Goal[];
  memorizationRecords: MemorizationRecord[];
  settings: AppSettings;
}

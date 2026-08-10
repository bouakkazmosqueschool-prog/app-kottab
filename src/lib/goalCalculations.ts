import type { EvaluationGrade, Goal, GoalStatus } from '../types';

/**
 * يحسب حالة الإنجاز تلقائياً بمقارنة المطلوب بالمنجز.
 * - achievedAmount === null  → لم يُسجَّل بعد (الفترة مازالت جارية)
 * - achievedAmount === 0     → لم يتم الإنجاز
 * - 0 < achieved < target    → تم الإنجاز جزئياً
 * - achieved === target      → تم الإنجاز
 * - achieved > target        → تم الإنجاز وزيادة
 */
export function computeStatus(targetAmount: number, achievedAmount: number | null): GoalStatus {
  if (achievedAmount === null) return 'pending';
  if (achievedAmount <= 0) return 'not_completed';
  if (achievedAmount < targetAmount) return 'partial';
  if (achievedAmount === targetAmount) return 'completed';
  return 'completed_plus';
}

/** نسبة الإنجاز المئوية (منجز/مطلوب × 100)، منزلة عشرية واحدة. null إن لم يُسجَّل بعد */
export function computePercentage(targetAmount: number, achievedAmount: number | null): number | null {
  if (achievedAmount === null) return null;
  if (targetAmount <= 0) return achievedAmount > 0 ? 100 : 0;
  return Math.round((achievedAmount / targetAmount) * 1000) / 10;
}

/** التقييم يُحسب تلقائياً من النسبة المئوية */
export function computeEvaluation(percentage: number | null): EvaluationGrade | null {
  if (percentage === null) return null;
  if (percentage >= 100) return 'ممتاز';
  if (percentage >= 80) return 'جيد جدًا';
  if (percentage >= 60) return 'جيد';
  if (percentage >= 40) return 'مقبول';
  return 'ضعيف';
}

export interface GoalComputed {
  status: GoalStatus;
  percentage: number | null;
  evaluation: EvaluationGrade | null;
}

export function computeGoal(goal: Pick<Goal, 'targetAmount' | 'achievedAmount'>): GoalComputed {
  const status = computeStatus(goal.targetAmount, goal.achievedAmount);
  const percentage = computePercentage(goal.targetAmount, goal.achievedAmount);
  const evaluation = computeEvaluation(percentage);
  return { status, percentage, evaluation };
}

export const STATUS_LABELS: Record<GoalStatus, string> = {
  pending: 'قيد الإنجاز',
  not_completed: 'لم يتم الإنجاز',
  partial: 'تم الإنجاز جزئياً',
  completed: 'تم الإنجاز',
  completed_plus: 'تم الإنجاز وزيادة',
};

/** إحصائيات مجمّعة على مجموعة أهداف */
export interface GoalStats {
  total: number;
  pending: number;
  notCompleted: number;
  partial: number;
  completed: number;
  completedPlus: number;
  /** معدل الإنجاز العام: متوسط النسب المئوية للأهداف المسجَّلة فقط */
  averagePercentage: number | null;
}

export function computeGoalStats(goals: Pick<Goal, 'targetAmount' | 'achievedAmount'>[]): GoalStats {
  const stats: GoalStats = {
    total: goals.length,
    pending: 0,
    notCompleted: 0,
    partial: 0,
    completed: 0,
    completedPlus: 0,
    averagePercentage: null,
  };
  let sumPct = 0;
  let countRecorded = 0;
  for (const g of goals) {
    const { status, percentage } = computeGoal(g);
    switch (status) {
      case 'pending':
        stats.pending++;
        break;
      case 'not_completed':
        stats.notCompleted++;
        break;
      case 'partial':
        stats.partial++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'completed_plus':
        stats.completedPlus++;
        break;
    }
    if (percentage !== null) {
      sumPct += percentage;
      countRecorded++;
    }
  }
  stats.averagePercentage = countRecorded > 0 ? Math.round((sumPct / countRecorded) * 10) / 10 : null;
  return stats;
}

import { generateSeedData } from './seed';

/**
 * غرزة ثابتة لضمان توليد نفس البيانات التجريبية بشكل متّسق:
 * كل المتاجر (students/goals/memorization) تنطلق من نفس الحزمة
 * حتى لا تتضارب مُعرّفات التلاميذ بين متجر وآخر.
 */
export const DEMO_SEED_VALUE = 20260810;

export const INITIAL_DATA = generateSeedData(DEMO_SEED_VALUE);

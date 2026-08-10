/** مولّد أرقام عشوائية بذرة ثابتة (mulberry32) لبيانات تجريبية قابلة لإعادة الإنتاج */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return function rng(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof createRng>;

export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randChoice<T>(rng: Rng, arr: T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

/**
 * معرّف زائف ثابت مبني على المولّد ذي البذرة (وليس crypto.randomUUID العشوائي حقاً).
 * يُستعمل حصراً لتوليد بيانات تجريبية تبقى متطابقة عبر كل إعادة تحميل للصفحة،
 * حتى قبل أن يقوم localStorage بحفظ أي تغيير حقيقي من المستخدم.
 */
export function seededId(rng: Rng, prefix: string): string {
  const hex = () => Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0');
  return `${prefix}_${hex()}${hex()}`;
}

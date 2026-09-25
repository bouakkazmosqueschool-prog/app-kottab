import { supabase } from './supabaseClient';

/**
 * تشفير البيانات الشخصية (هاتف ولي الأمر + صورة التلميذ) بـ AES-GCM.
 * المفتاح يُجلب من قاعدة البيانات (Vault) عبر دالة get_pii_key بعد تسجيل الدخول،
 * ولا يُخزَّن في كود التطبيق. النصوص المشفَّرة تبدأ بالبادئة enc:v1: لتمييزها
 * عن القيم القديمة غير المشفَّرة (توافق رجعي).
 */

const PREFIX = 'enc:v1:';
let keyPromise: Promise<CryptoKey | null> | null = null;

async function fetchKey(): Promise<CryptoKey | null> {
  try {
    const { data, error } = await supabase.rpc('get_pii_key');
    if (error || !data) return null;
    const raw = base64ToBytes(String(data));
    return await crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}

function ensureKey(): Promise<CryptoKey | null> {
  if (!keyPromise) keyPromise = fetchKey();
  return keyPromise;
}

/** يُنسى المفتاح المحفوظ في الذاكرة (يُستدعى عند تسجيل الخروج) */
export function resetPiiKey(): void {
  keyPromise = null;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function isEncrypted(v?: string | null): boolean {
  return !!v && v.startsWith(PREFIX);
}

/** يُشفّر نصاً. إن تعذّر جلب المفتاح يُعيد النص كما هو (حتى لا تُفقَد البيانات). */
export async function encryptPii(text?: string | null): Promise<string> {
  if (!text) return '';
  if (isEncrypted(text)) return text;
  const key = await ensureKey();
  if (!key) return text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(text) as BufferSource),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return PREFIX + bytesToBase64(combined);
}

/** يفكّ تشفير نص. القيم غير المشفَّرة (قديمة) تُعاد كما هي. */
export async function decryptPii(value?: string | null): Promise<string> {
  if (!value) return '';
  if (!isEncrypted(value)) return value;
  const key = await ensureKey();
  if (!key) return '';
  try {
    const combined = base64ToBytes(value.slice(PREFIX.length));
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource);
    return new TextDecoder().decode(pt);
  } catch {
    return '';
  }
}

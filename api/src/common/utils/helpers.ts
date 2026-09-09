export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const randomCode = (length = 8, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'): string => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : round2(Object.is(part, NaN) || part < 0 ? 0 : (part / whole) * 100);

export const isIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

export const safeJsonParse = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

export const nowIso = (): string => new Date().toISOString();

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
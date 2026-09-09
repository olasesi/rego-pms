import {
  slugify,
  clamp,
  round2,
  percent,
  parseNumber,
  safeJsonParse,
  isIsoDate,
  isUuid,
  randomCode,
} from '../../src/common/utils/helpers';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips diacritics', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });
  it('trims leading/trailing separators', () => {
    expect(slugify('  --Acme Corp--  ')).toBe('acme-corp');
  });
});

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(2.005)).toBe(2.01);
  });
});

describe('percent', () => {
  it('zero whole returns zero', () => {
    expect(percent(50, 0)).toBe(0);
  });
  it('computes bounded percentage', () => {
    expect(percent(25, 100)).toBe(25);
    expect(percent(-10, 100)).toBe(0);
  });
});

describe('parseNumber', () => {
  it('parses numbers and numeric strings', () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber('3.5')).toBe(3.5);
    expect(parseNumber('nope')).toBeNull();
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(Number.NaN)).toBeNull();
  });
});

describe('safeJsonParse', () => {
  it('returns fallback for empty/blank input', () => {
    expect(safeJsonParse('', { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse(null, 'x')).toBe('x');
  });
  it('parses valid JSON and returns fallback on malformed', () => {
    expect(safeJsonParse('{"k":1}', {})).toEqual({ k: 1 });
    expect(safeJsonParse('{bad', [])).toEqual([]);
  });
});

describe('isIsoDate', () => {
  it('detects parseable dates', () => {
    expect(isIsoDate('2024-01-01T00:00:00.000Z')).toBe(true);
    expect(isIsoDate('not-a-date')).toBe(false);
  });
});

describe('isUuid', () => {
  it('validates uuid v4', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
  });
});

describe('randomCode', () => {
  it('returns string of requested length with expected charset', () => {
    const code = randomCode(10);
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
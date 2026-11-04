import { describe, expect, it } from 'vitest';

import ar from '@/i18n/locales/ar.json';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import hi from '@/i18n/locales/hi.json';
import zh from '@/i18n/locales/zh.json';
import { RTL_LOCALES, SUPPORTED_LOCALES, isRtlLocale } from '@/i18n';

const flatten = (value: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, entry]) =>
    entry && typeof entry === 'object'
      ? flatten(entry as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

const reference = flatten(en).sort();
const locales: Array<[string, Record<string, unknown>]> = [
  ['fr', fr],
  ['es', es],
  ['de', de],
  ['hi', hi],
  ['zh', zh],
  ['ar', ar],
];

describe('frontend locales', () => {
  it('registers every supported locale', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'fr', 'es', 'de', 'hi', 'zh', 'ar']);
  });

  it.each(locales)('keeps %s in sync with the English key set', (_locale, messages) => {
    expect(flatten(messages).sort()).toEqual(reference);
  });

  it('marks Arabic as the only right-to-left locale', () => {
    expect(RTL_LOCALES).toEqual(['ar']);
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
    expect(isRtlLocale('hi')).toBe(false);
  });
});

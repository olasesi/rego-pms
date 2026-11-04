import { createI18n } from 'vue-i18n';

import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';

export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de', 'hi', 'zh', 'ar'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

/** Locales written right-to-left. The app shell uses logical CSS properties. */
export const RTL_LOCALES: readonly AppLocale[] = ['ar'];

export const LOCALE_STORAGE_KEY = 'pms.locale';

/** Language names are always shown in their own language. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  hi: 'हिन्दी',
  zh: '中文',
  ar: 'العربية',
};

const messages = { en, fr, es, de, hi, zh, ar };

export const isSupportedLocale = (value: string): value is AppLocale =>
  (SUPPORTED_LOCALES as readonly string[]).includes(value);

export const isRtlLocale = (locale: AppLocale): boolean => RTL_LOCALES.includes(locale);

/** Resolve the initial locale from storage, then the browser, then English. */
export const detectLocale = (): AppLocale => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && isSupportedLocale(stored)) return stored;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const candidate of candidates) {
    const base = candidate.split('-')[0]?.toLowerCase() ?? '';
    if (isSupportedLocale(base)) return base;
  }
  return 'en';
};

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages,
  missingWarn: false,
  fallbackWarn: false,
});

/** Update the active locale, `<html lang>`/`dir` and persist the choice. */
export const applyLocale = (locale: AppLocale): void => {
  i18n.global.locale.value = locale;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
  }
};

// Keep the document in sync with the initial locale.
applyLocale(i18n.global.locale.value as AppLocale);

export default i18n;

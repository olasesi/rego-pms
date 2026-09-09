import path from 'path';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { LanguageDetector, handle as i18nextHttpMiddleware } from 'i18next-http-middleware';
import { config } from './env';

export const i18n = i18next.use(Backend).use(LanguageDetector);

export async function initI18n(): Promise<typeof i18n> {
  const localesDir = path.resolve(__dirname, '../locales');
  await i18n.init({
    fallbackLng: config.DEFAULT_LOCALE,
    supportedLngs: config.supportedLocales(),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    preload: config.supportedLocales(),
    backend: {
      loadPath: path.join(localesDir, '{{lng}}', 'translation.json'),
    },
    detection: {
      order: ['header', 'querystring'],
      lookupQuerystring: 'lng',
      lookupHeader: 'accept-language',
      caches: false,
    },
    interpolation: {
      escapeValue: false,
    },
    returnObjects: false,
  });
  return i18n;
}

export const i18nMiddleware = i18nextHttpMiddleware(i18n);

export default i18n;
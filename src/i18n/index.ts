import i18next, { type TFunction } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_CONFIG } from '@/config/app.config';
import type { Language, NumberFormat } from '@/types';
import { formatNumber } from '@/utils/format';
import { bn } from './bn';
import { en } from './en';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['bn', 'en'];

export const resources = {
  bn: { translation: bn },
  en: { translation: en },
} as const;

export const i18n = i18next;

export type Translator = TFunction;

/** Number format used by the `num` interpolation formatter. */
let activeNumberFormat: NumberFormat = APP_CONFIG.defaults.numberFormat;

export function isLanguage(value: unknown): value is Language {
  return value === 'bn' || value === 'en';
}

/** Updates <html lang dir> so fonts, line-height and screen readers follow. */
export function applyDocumentLanguage(language: Language): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = language;
  root.dir = i18n.dir(language);
}

/**
 * Initializes i18next synchronously (all resources are bundled, nothing is
 * fetched). Safe to call more than once.
 */
export function initI18n(language: Language = APP_CONFIG.defaults.language): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES,
      defaultNS: 'translation',
      ns: ['translation'],
      initAsync: false,
      interpolation: {
        // React already escapes rendered text.
        escapeValue: false,
      },
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged',
      },
    });
    i18n.services.formatter?.add('num', (value: unknown) =>
      typeof value === 'number' ? formatNumber(value, activeNumberFormat) : String(value ?? ''),
    );
  } else if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  applyDocumentLanguage(language);
  return i18n;
}

/** Switches the UI language without reloading or losing application state. */
export function setI18nLanguage(language: Language): void {
  if (i18n.language !== language) {
    void i18n.changeLanguage(language);
  }
  applyDocumentLanguage(language);
}

/** Changes the digits used by translated strings and re-renders them. */
export function setI18nNumberFormat(numberFormat: NumberFormat): void {
  if (activeNumberFormat === numberFormat) return;
  activeNumberFormat = numberFormat;
  // Re-emit languageChanged so react-i18next re-renders interpolated numbers.
  void i18n.changeLanguage(i18n.language);
}

/** Translator bound to a specific language (receipts, KOT reprints). */
export function getFixedT(language: Language): Translator {
  return i18n.getFixedT(language);
}

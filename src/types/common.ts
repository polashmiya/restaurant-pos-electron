export type Language = 'bn' | 'en';

export type Theme = 'dark' | 'light' | 'system';

/** The resolved theme actually applied to the document. */
export type ResolvedTheme = 'dark' | 'light';

/** `western` = 0-9, `bengali` = ০-৯ */
export type NumberFormat = 'western' | 'bengali';

export interface LocalizedText {
  bn: string;
  en: string;
}

/** ISO-8601 timestamp, e.g. 2026-09-10T08:30:00.000Z */
export type ISODateString = string;

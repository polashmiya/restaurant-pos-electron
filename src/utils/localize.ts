import type { Language, LocalizedText } from '@/types';

/** Picks the text for a language, falling back to the other language. */
export function localize(text: LocalizedText | undefined, language: Language): string {
  if (!text) return '';
  const primary = text[language]?.trim();
  if (primary) return primary;
  return (language === 'bn' ? text.en : text.bn)?.trim() ?? '';
}

/** Same text for both languages (free-text notes, customer input). */
export function sameInBothLanguages(value: string): LocalizedText {
  return { bn: value, en: value };
}

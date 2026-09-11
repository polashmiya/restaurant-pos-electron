import type { ParseKeys } from 'i18next';

/** Any valid translation key, e.g. "payment.payAndPrint". */
export type TranslationKey = ParseKeys<'translation'>;

export type TranslationParams = Record<string, string | number>;

/**
 * A message stored in state (toasts, dialogs). It is translated at render
 * time, so it follows the current language even if it changes later.
 */
export interface TranslatableMessage {
  key: TranslationKey;
  params?: TranslationParams;
}

export function message(key: TranslationKey, params?: TranslationParams): TranslatableMessage {
  return params ? { key, params } : { key };
}

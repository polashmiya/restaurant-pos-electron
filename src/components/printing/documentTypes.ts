import type { Formatters } from '@/hooks/useFormatters';
import type { Translator } from '@/i18n';
import type { Language, LocalizedText, PaperWidth } from '@/types';

/** Restaurant details printed in document headers/footers. */
export interface RestaurantInfo {
  name: LocalizedText;
  address: LocalizedText;
  phone: string;
  taxId: string;
  footer: LocalizedText;
}

/**
 * Everything a printable document needs, resolved for ONE language (the
 * order's language for receipts), independent of the current UI language.
 */
export interface DocumentContext {
  language: Language;
  t: Translator;
  format: Formatters;
  restaurant: RestaurantInfo;
  paperWidth: PaperWidth;
}

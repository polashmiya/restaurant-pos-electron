import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { LocalizedText } from '@/types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  formatNumber,
  formatPercent,
  formatShortDate,
  formatTime,
  localizeDigits,
  type FormatContext,
  type NumberFormatOptions,
} from '@/utils/format';
import { localize } from '@/utils/localize';

export interface Formatters {
  context: FormatContext;
  /** "৳ 250.00" using the configured currency symbol and digits. */
  currency: (amount: number) => string;
  /** "৳ 500" for whole amounts, "৳ 12.50" otherwise. */
  currencyShort: (amount: number) => string;
  number: (value: number, options?: NumberFormatOptions) => string;
  percent: (value: number) => string;
  date: (value: string | number | Date) => string;
  time: (value: string | number | Date) => string;
  dateTime: (value: string | number | Date) => string;
  longDate: (value: string | number | Date) => string;
  /** "10 Sep" */
  shortDate: (value: string | number | Date) => string;
  /** "Sep 2026" */
  monthYear: (value: string | number | Date) => string;
  /** Converts digits inside any string (e.g. table names). */
  digits: (value: string) => string;
  /** Bangla or English text of a bilingual value. */
  text: (value: LocalizedText | undefined) => string;
}

export function createFormatters(context: FormatContext): Formatters {
  return {
    context,
    currency: (amount) => formatCurrency(amount, context),
    currencyShort: (amount) => formatCurrency(amount, context, { trimWhole: true }),
    number: (value, options) => formatNumber(value, context.numberFormat, options),
    percent: (value) => formatPercent(value, context.numberFormat),
    date: (value) => formatDate(value, context),
    time: (value) => formatTime(value, context),
    dateTime: (value) => formatDateTime(value, context),
    longDate: (value) => formatLongDate(value, context),
    shortDate: (value) => formatShortDate(value, context),
    monthYear: (value) => formatMonthYear(value, context),
    digits: (value) => localizeDigits(value, context.numberFormat),
    text: (value) => localize(value, context.language),
  };
}

/** Formatters bound to the current language, digits and currency. */
export function useFormatters(): Formatters {
  const language = useSettingsStore((state) => state.settings.language);
  const numberFormat = useSettingsStore((state) => state.settings.numberFormat);
  const currencySymbol = useSettingsStore((state) => state.settings.currencySymbol);
  return useMemo(
    () => createFormatters({ language, numberFormat, currencySymbol }),
    [language, numberFormat, currencySymbol],
  );
}

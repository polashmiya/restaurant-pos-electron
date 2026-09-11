import { APP_CONFIG } from '@/config/app.config';
import type { Language, NumberFormat } from '@/types';
import { roundMoney } from './money';

/**
 * Centralized formatting. Every number, price, date and time shown in the UI
 * or printed on a receipt goes through these functions so that the currency,
 * language and number-format settings are applied consistently.
 */

export interface FormatContext {
  language: Language;
  numberFormat: NumberFormat;
  currencySymbol: string;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;
const BENGALI_DIGIT_PATTERN = /[০-৯]/g;

/** Replaces 0-9 with ০-৯ when the Bangla number format is selected. */
export function localizeDigits(value: string, numberFormat: NumberFormat): string {
  if (numberFormat !== 'bengali') return value;
  return value.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

/** Converts Bangla digits typed by the user into 0-9 (for parsing input). */
export function toWesternDigits(value: string): string {
  return value.replace(BENGALI_DIGIT_PATTERN, (digit) => String(BENGALI_DIGITS.indexOf(digit as (typeof BENGALI_DIGITS)[number])));
}

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(minimumFractionDigits: number, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    // Western grouping (1,234.50) is used for both languages; digits are
    // localized afterwards so the grouping stays predictable for cashiers.
    formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits });
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumber(value: number, numberFormat: NumberFormat, options: NumberFormatOptions = {}): string {
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  const maximumFractionDigits = Math.max(options.maximumFractionDigits ?? 2, minimumFractionDigits);
  const safe = Number.isFinite(value) ? value : 0;
  return localizeDigits(getNumberFormatter(minimumFractionDigits, maximumFractionDigits).format(safe), numberFormat);
}

/**
 * "৳ 250.00" — symbol, space, amount with two decimals.
 * `trimWhole` drops ".00" for whole amounts (quick-cash buttons: "৳ 500").
 */
export function formatCurrency(
  amount: number,
  context: Pick<FormatContext, 'numberFormat' | 'currencySymbol'>,
  options: { trimWhole?: boolean } = {},
): string {
  const rounded = roundMoney(amount);
  const sign = rounded < 0 ? '-' : '';
  const whole = Number.isInteger(rounded);
  const fractionDigits = options.trimWhole && whole ? 0 : 2;
  const digits = formatNumber(Math.abs(rounded), context.numberFormat, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
  const symbol = context.currencySymbol.trim();
  return symbol ? `${sign}${symbol} ${digits}` : `${sign}${digits}`;
}

/** "5%" */
export function formatPercent(value: number, numberFormat: NumberFormat): string {
  return `${formatNumber(value, numberFormat, { maximumFractionDigits: 2 })}%`;
}

/* ------------------------------ Dates & times ------------------------------ */

const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getLocale(language: Language, numberFormat: NumberFormat): string {
  const numberingSystem = numberFormat === 'bengali' ? 'beng' : 'latn';
  return `${APP_CONFIG.locales[language]}-u-nu-${numberingSystem}`;
}

function getDateFormatter(
  context: Pick<FormatContext, 'language' | 'numberFormat'>,
  kind: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const locale = getLocale(context.language, context.numberFormat);
  const key = `${locale}|${kind}`;
  let formatter = dateFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatCache.set(key, formatter);
  }
  return formatter;
}

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** 10/09/2026 (or ১০/০৯/২০২৬) */
export function formatDate(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return getDateFormatter(context, 'date', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(toDate(value));
}

/** 02:30 PM */
export function formatTime(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return getDateFormatter(context, 'time', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: APP_CONFIG.ui.hour12,
  }).format(toDate(value));
}

/** 10/09/2026, 02:30 PM */
export function formatDateTime(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return `${formatDate(value, context)}, ${formatTime(value, context)}`;
}

/** Thursday, 10 September 2026 */
export function formatLongDate(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return getDateFormatter(context, 'long-date', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toDate(value));
}

/** 10 Sep (chart axes) */
export function formatShortDate(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return getDateFormatter(context, 'short-date', { day: 'numeric', month: 'short' }).format(toDate(value));
}

/** Sep 2026 (monthly report buckets) */
export function formatMonthYear(value: string | number | Date, context: Pick<FormatContext, 'language' | 'numberFormat'>): string {
  return getDateFormatter(context, 'month-year', { month: 'short', year: 'numeric' }).format(toDate(value));
}

/** Local date key YYYYMMDD (used in order numbers). */
export function formatDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/** Local YYYY-MM-DD (used in file names). */
export function formatIsoDay(value: Date): string {
  const key = formatDateKey(value);
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

/** Splits a duration into whole hours and minutes. */
export function splitDuration(milliseconds: number): { hours: number; minutes: number } {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

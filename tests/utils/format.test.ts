import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateKey,
  formatNumber,
  formatTime,
  localizeDigits,
  toWesternDigits,
} from '@/utils/format';
import { localize } from '@/utils/localize';

describe('formatters', () => {
  it('formats the default currency as "৳ 250.00"', () => {
    expect(formatCurrency(250, { currencySymbol: '৳', numberFormat: 'western' })).toBe('৳ 250.00');
    expect(formatCurrency(1234.5, { currencySymbol: '৳', numberFormat: 'western' })).toBe('৳ 1,234.50');
  });

  it('uses the configured currency symbol (never a hard-coded $)', () => {
    expect(formatCurrency(10, { currencySymbol: '$', numberFormat: 'western' })).toBe('$ 10.00');
    expect(formatCurrency(10, { currencySymbol: '€', numberFormat: 'western' })).toBe('€ 10.00');
  });

  it('supports Bangla numerals as an option', () => {
    expect(formatCurrency(250, { currencySymbol: '৳', numberFormat: 'bengali' })).toBe('৳ ২৫০.০০');
    expect(formatNumber(1234, 'bengali')).toBe('১,২৩৪');
    expect(localizeDigits('Table 05', 'bengali')).toBe('Table ০৫');
    expect(toWesternDigits('১২৩.৫০')).toBe('123.50');
  });

  it('rounds money consistently', () => {
    expect(formatCurrency(0.1 + 0.2, { currencySymbol: '৳', numberFormat: 'western' })).toBe('৳ 0.30');
    expect(formatCurrency(2.675, { currencySymbol: '৳', numberFormat: 'western' })).toBe('৳ 2.68');
  });

  it('formats dates per language and number format', () => {
    const date = new Date(2026, 8, 10, 14, 30);
    expect(formatDate(date, { language: 'en', numberFormat: 'western' })).toBe('10/09/2026');
    expect(formatDate(date, { language: 'bn', numberFormat: 'bengali' })).toBe('১০/০৯/২০২৬');
    expect(formatDate(date, { language: 'bn', numberFormat: 'western' })).toBe('10/09/2026');
    expect(formatTime(date, { language: 'en', numberFormat: 'western' })).toMatch(/02:30\s?pm/i);
  });

  it('builds the local YYYYMMDD key used in order numbers', () => {
    expect(formatDateKey(new Date(2026, 8, 10))).toBe('20260910');
  });

  it('localizes bilingual text with a fallback', () => {
    expect(localize({ bn: 'চিকেন বার্গার', en: 'Chicken Burger' }, 'bn')).toBe('চিকেন বার্গার');
    expect(localize({ bn: 'চিকেন বার্গার', en: 'Chicken Burger' }, 'en')).toBe('Chicken Burger');
    expect(localize({ bn: '', en: 'Chicken Burger' }, 'bn')).toBe('Chicken Burger');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { getFixedT, i18n, setI18nLanguage, setI18nNumberFormat } from '@/i18n';
import { bn } from '@/i18n/bn';
import { en } from '@/i18n/en';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else for (const [nestedKey, nestedValue] of flatten(value, path)) entries.set(nestedKey, nestedValue);
  }
  return entries;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([\w]+)[^}]*\}\}/g)].map((match) => match[1] ?? '').sort();
}

describe('translations', () => {
  const bnEntries = flatten(bn as unknown as Tree);
  const enEntries = flatten(en as unknown as Tree);

  afterEach(() => {
    setI18nLanguage('bn');
    setI18nNumberFormat('western');
  });

  it('Bangla and English define exactly the same keys', () => {
    expect([...bnEntries.keys()].sort()).toEqual([...enEntries.keys()].sort());
  });

  it('no translation is empty', () => {
    for (const [key, value] of [...bnEntries, ...enEntries]) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('every translation uses the same interpolation variables in both languages', () => {
    for (const [key, enValue] of enEntries) {
      expect(placeholders(bnEntries.get(key) ?? ''), key).toEqual(placeholders(enValue));
    }
  });

  it('Bangla UI strings are actually Bangla (not copied English)', () => {
    const bengaliScript = /[ঀ-৿]/;
    const allowedLatin = new Set(['language.en', 'common.withShortcut', 'tables.count', 'tables.orderSummary']);
    for (const [key, value] of bnEntries) {
      if (allowedLatin.has(key)) continue;
      expect(bengaliScript.test(value), `${key}: "${value}"`).toBe(true);
    }
  });

  it('defaults to Bangla and switches languages without reloading', () => {
    expect(i18n.language).toBe('bn');
    expect(i18n.t('nav.pos')).toBe('বিক্রয়');
    expect(i18n.t('cart.payAndPrint')).toBe('পেমেন্ট ও বিল প্রিন্ট');

    setI18nLanguage('en');
    expect(i18n.t('nav.pos')).toBe('POS');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    setI18nLanguage('bn');
    expect(i18n.t('payment.insufficient')).toBe('পর্যাপ্ত টাকা দেওয়া হয়নি');
    expect(document.documentElement.lang).toBe('bn');
  });

  it('localized spec terminology is used', () => {
    const t = getFixedT('bn');
    expect(t('nav.tables')).toBe('টেবিল');
    expect(t('nav.orders')).toBe('অর্ডার');
    expect(t('nav.shift')).toBe('শিফট');
    expect(t('nav.settings')).toBe('সেটিংস');
    expect(t('cart.subtotal')).toBe('উপমোট');
    expect(t('cart.discount')).toBe('ছাড়');
    expect(t('paymentMethod.cash')).toBe('নগদ');
    expect(t('paymentMethod.mobile')).toBe('মোবাইল ব্যাংকিং');
    expect(t('payment.change')).toBe('ফেরত');
    expect(t('tableStatus.available')).toBe('খালি');
    expect(t('tableStatus.waiting')).toBe('বিলের অপেক্ষায়');
    expect(t('orderType.dine-in')).toBe('ডাইন-ইন');
    expect(t('errors.saveFailed')).toBe('অর্ডার সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    expect(t('confirm.clearOrderMessage')).toBe('আপনি কি এই অর্ডারটি খালি করতে চান?');
  });

  it('fixed translators render receipts in the order language regardless of the UI language', () => {
    setI18nLanguage('en');
    expect(getFixedT('bn')('receipt.thankYou')).toBe('ধন্যবাদ');
    expect(getFixedT('en')('receipt.total')).toBe('TOTAL');
    expect(getFixedT('bn')('kot.title')).toBe('কিচেন অর্ডার');
    expect(getFixedT('en')('kot.title')).toBe('KITCHEN ORDER TICKET');
  });

  it('interpolated numbers follow the number-format setting', () => {
    setI18nLanguage('en');
    expect(i18n.t('common.itemCount', { count: 1 })).toBe('1 item');
    expect(i18n.t('common.itemCount', { count: 12 })).toBe('12 items');

    setI18nLanguage('bn');
    setI18nNumberFormat('bengali');
    expect(i18n.t('common.itemCount', { count: 12 })).toBe('১২টি আইটেম');
  });
});

import { ACCENT_COLORS, APP_CONFIG, CARD_SIZES, LAYOUT_DENSITIES, TABLE_VIEWS, TEXT_SIZES } from '@/config/app.config';
import type { AppSettings, PrinterSettings, UIPreferences } from '@/types';
import { isPlainObject } from './storeKeys';

/** Default application settings used on first launch and after a reset. */
export function createDefaultSettings(): AppSettings {
  return {
    name: { bn: 'আরবান স্পুন রেস্টুরেন্ট', en: 'Urban Spoon Restaurant' },
    address: { bn: '১২৩ মেইন স্ট্রিট, ঢাকা', en: '123 Main Street, Dhaka' },
    phone: '+880 1234 567890',
    taxId: 'TAX-123456',
    currency: APP_CONFIG.defaults.currency,
    currencySymbol: APP_CONFIG.defaults.currencySymbol,
    defaultTaxRate: APP_CONFIG.defaults.taxRate,
    language: APP_CONFIG.defaults.language,
    theme: APP_CONFIG.defaults.theme,
    numberFormat: APP_CONFIG.defaults.numberFormat,
    receiptFooter: { bn: 'আবার আসবেন!', en: 'Please visit again!' },
    printer: createDefaultPrinterSettings(),
    ui: createDefaultUIPreferences(),
  };
}

export function createDefaultPrinterSettings(): PrinterSettings {
  return {
    receiptPrinter: '',
    kotPrinter: '',
    paperWidth: APP_CONFIG.defaults.paperWidth,
    silentPrint: false,
    autoPrintReceipt: false,
    autoPrintKot: false,
    showPricesOnKot: false,
    receiptCopies: 1,
  };
}

export function createDefaultUIPreferences(): UIPreferences {
  return {
    density: 'comfortable',
    showItemImages: true,
    soundEffects: false,
    textSize: 'medium',
    cardSize: 'medium',
    accentColor: 'blue',
    tableView: 'iso',
    askGuestCount: true,
  };
}

/** Allowed values of the choice-type interface preferences. */
const UI_CHOICES: { [K in keyof UIPreferences]?: readonly UIPreferences[K][] } = {
  density: LAYOUT_DENSITIES,
  textSize: TEXT_SIZES,
  cardSize: CARD_SIZES,
  accentColor: ACCENT_COLORS,
  tableView: TABLE_VIEWS,
};

/** Replaces unknown choice values (a hand-edited file, a newer version's option) with the default. */
function sanitizeUIPreferences(ui: UIPreferences, defaults: UIPreferences): UIPreferences {
  const result: Record<string, unknown> = { ...ui };
  for (const [key, allowed] of Object.entries(UI_CHOICES) as [keyof UIPreferences, readonly unknown[]][]) {
    if (!allowed.includes(result[key])) result[key] = defaults[key];
  }
  return result as unknown as UIPreferences;
}

/**
 * Fills in any settings missing from stored data (e.g. after an update adds
 * a new option) while keeping every value the user already chose.
 */
export function mergeWithDefaultSettings(stored: unknown): AppSettings {
  const defaults = createDefaultSettings();
  if (!isPlainObject(stored)) return defaults;
  const merged = deepMerge(defaults as unknown as Record<string, unknown>, stored) as unknown as AppSettings;
  return { ...merged, ui: sanitizeUIPreferences(merged.ui, defaults.ui) };
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, baseValue] of Object.entries(base)) {
    const value = override[key];
    if (value === undefined || value === null) continue;
    if (isPlainObject(baseValue)) {
      result[key] = isPlainObject(value) ? deepMerge(baseValue, value) : baseValue;
    } else if (typeof value === typeof baseValue) {
      result[key] = value;
    }
  }
  return result;
}

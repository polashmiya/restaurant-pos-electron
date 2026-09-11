import { create } from 'zustand';
import { createDefaultSettings } from '@/data/defaults';
import { setI18nLanguage, setI18nNumberFormat } from '@/i18n';
import { getStorage } from '@/services/storage';
import type { AppSettings, Language, NumberFormat, PrinterSettings, Theme, UIPreferences } from '@/types';
import { AppError, logError } from '@/utils/errors';
import type { FormatContext } from '@/utils/format';
import { appearanceChanged, applyAppearance, applyTheme, rememberLook } from '@/utils/theme';

/**
 * Applies everything a settings change affects outside React: i18n
 * language, number digits, theme class, native title bar, density, text
 * size, card size and accent color.
 * Changing the language never reloads the app or touches cart/orders.
 */
function applySideEffects(previous: AppSettings | null, next: AppSettings): void {
  if (!previous || previous.language !== next.language) setI18nLanguage(next.language);
  if (!previous || previous.numberFormat !== next.numberFormat) setI18nNumberFormat(next.numberFormat);
  if (!previous || previous.theme !== next.theme) {
    applyTheme(next.theme);
    window.electronAPI?.app.setNativeTheme(next.theme).catch((error: unknown) => logError('native-theme', error));
  }
  if (!previous || appearanceChanged(previous.ui, next.ui)) applyAppearance(next.ui);
  if (!previous || previous.theme !== next.theme || appearanceChanged(previous.ui, next.ui)) {
    rememberLook({ theme: next.theme, ...next.ui });
  }
}

interface SettingsState {
  settings: AppSettings;
  isHydrated: boolean;

  /** Loads persisted settings (startup / refresh) and applies them. */
  hydrate: (settings: AppSettings) => void;
  /** Optimistically updates and persists; reverts if saving fails. */
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNumberFormat: (numberFormat: NumberFormat) => Promise<void>;
  updatePrinter: (patch: Partial<PrinterSettings>) => Promise<void>;
  updateUI: (patch: Partial<UIPreferences>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: createDefaultSettings(),
  isHydrated: false,

  hydrate: (settings) => {
    const previous = get().isHydrated ? get().settings : null;
    applySideEffects(previous, settings);
    set({ settings, isHydrated: true });
  },

  updateSettings: async (patch) => {
    const previous = get().settings;
    const next: AppSettings = { ...previous, ...patch };
    applySideEffects(previous, next);
    set({ settings: next });
    try {
      await getStorage().set('settings', next);
    } catch (error) {
      applySideEffects(next, previous);
      set({ settings: previous });
      throw new AppError('storage', 'errors.settingsSaveFailed', { cause: error });
    }
  },

  setLanguage: (language) => get().updateSettings({ language }),
  setTheme: (theme) => get().updateSettings({ theme }),
  setNumberFormat: (numberFormat) => get().updateSettings({ numberFormat }),
  updatePrinter: (patch) => get().updateSettings({ printer: { ...get().settings.printer, ...patch } }),
  updateUI: (patch) => get().updateSettings({ ui: { ...get().settings.ui, ...patch } }),
}));

/** Formatting context for code outside React (print documents, services). */
export function getFormatContext(): FormatContext {
  const { language, numberFormat, currencySymbol } = useSettingsStore.getState().settings;
  return { language, numberFormat, currencySymbol };
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultSettings, createDefaultUIPreferences, mergeWithDefaultSettings } from '@/data/defaults';
import { i18n } from '@/i18n';
import { setStorageAdapter } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { isAppError } from '@/utils/errors';
import { applyRememberedLook } from '@/utils/theme';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

describe('settings store — language & preference persistence', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = createMemoryStorage();
    setStorageAdapter(storage);
    useSettingsStore.setState({ settings: createDefaultSettings(), isHydrated: false });
    useSettingsStore.getState().hydrate(storage.data.settings);
  });

  afterEach(() => {
    setStorageAdapter(null);
  });

  it('starts in Bangla with the dark theme', () => {
    expect(useSettingsStore.getState().settings.language).toBe('bn');
    expect(i18n.language).toBe('bn');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists Bangla → English → Bangla and applies each change immediately', async () => {
    await useSettingsStore.getState().setLanguage('en');
    expect(storage.data.settings.language).toBe('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('nav.settings')).toBe('Settings');

    await useSettingsStore.getState().setLanguage('bn');
    expect(storage.data.settings.language).toBe('bn');
    expect(i18n.t('nav.settings')).toBe('সেটিংস');
  });

  it('restores the saved language after a simulated restart', async () => {
    await useSettingsStore.getState().setLanguage('en');

    // "Restart": fresh store state hydrated from what was persisted.
    useSettingsStore.setState({ settings: createDefaultSettings(), isHydrated: false });
    useSettingsStore.getState().hydrate(storage.data.settings);

    expect(useSettingsStore.getState().settings.language).toBe('en');
    expect(i18n.language).toBe('en');
  });

  it('persists theme, number format and UI preferences', async () => {
    const store = useSettingsStore.getState();
    await store.setTheme('light');
    await store.setNumberFormat('bengali');
    await store.updateUI({ density: 'compact', showItemImages: false });
    await store.updatePrinter({ autoPrintKot: true, paperWidth: '58mm' });

    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.dataset.density).toBe('compact');
    expect(storage.data.settings.theme).toBe('light');
    expect(storage.data.settings.numberFormat).toBe('bengali');
    expect(storage.data.settings.ui).toMatchObject({ density: 'compact', showItemImages: false, soundEffects: false });
    expect(storage.data.settings.printer.autoPrintKot).toBe(true);
    expect(storage.data.settings.printer.paperWidth).toBe('58mm');
  });

  it('applies text size, card size and accent color to the whole interface', async () => {
    const root = document.documentElement;
    expect(root.style.fontSize).toBe('100%');
    expect(root.dataset.accent).toBe('blue');
    expect(root.style.getPropertyValue('--app-card-scale')).toBe('1');

    await useSettingsStore.getState().updateUI({ textSize: 'xlarge', cardSize: 'large', accentColor: 'teal' });
    expect(root.style.fontSize).toBe('125%');
    expect(root.style.getPropertyValue('--app-card-scale')).toBe('1.25');
    expect(root.dataset.accent).toBe('teal');
    expect(storage.data.settings.ui).toMatchObject({ textSize: 'xlarge', cardSize: 'large', accentColor: 'teal' });

    // Restart: the choices come back from storage.
    useSettingsStore.setState({ settings: createDefaultSettings(), isHydrated: false });
    useSettingsStore.getState().hydrate(storage.data.settings);
    expect(root.style.fontSize).toBe('125%');
    expect(root.dataset.accent).toBe('teal');
  });

  it('reverts the change and reports a friendly error when saving fails', async () => {
    storage.failOn('set');

    const attempt = useSettingsStore.getState().setLanguage('en');
    await expect(attempt).rejects.toSatisfy(isAppError);

    expect(useSettingsStore.getState().settings.language).toBe('bn');
    expect(i18n.language).toBe('bn');
    expect(storage.data.settings.language).toBe('bn');
  });
});

describe('startup look (loading screen before settings arrive)', () => {
  beforeEach(() => {
    setStorageAdapter(createMemoryStorage());
    useSettingsStore.setState({ settings: createDefaultSettings(), isHydrated: false });
  });

  afterEach(() => setStorageAdapter(null));

  it('remembers theme, accent and sizes and applies them on the next start', async () => {
    await useSettingsStore.getState().setTheme('light');
    await useSettingsStore.getState().updateUI({ accentColor: 'orange', textSize: 'large', cardSize: 'small' });

    // Next start: the page begins with the defaults from index.html…
    const root = document.documentElement;
    root.className = 'dark';
    root.dataset.accent = 'blue';
    root.style.fontSize = '';

    // …and the remembered look is applied before React renders.
    applyRememberedLook();
    expect(root.classList.contains('light')).toBe(true);
    expect(root.dataset.accent).toBe('orange');
    expect(root.style.fontSize).toBe('112.5%');
    expect(root.style.getPropertyValue('--app-card-scale')).toBe('0.85');
  });

  it('ignores a damaged or unknown remembered look', () => {
    window.localStorage.setItem('restaurant-pos-look', '{not json');
    expect(() => applyRememberedLook()).not.toThrow();

    window.localStorage.setItem('restaurant-pos-look', JSON.stringify({ theme: 'neon', accentColor: 'pink', textSize: 'huge' }));
    applyRememberedLook();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.dataset.accent).toBe('blue');
    expect(document.documentElement.style.fontSize).toBe('100%');
  });
});

describe('stored settings from older versions or edited files', () => {
  it('fill in new display options with defaults and keep the user’s choices', () => {
    const settings = mergeWithDefaultSettings({ language: 'en', ui: { density: 'compact', showItemImages: false } });
    expect(settings.language).toBe('en');
    expect(settings.ui).toEqual({
      ...createDefaultUIPreferences(),
      density: 'compact',
      showItemImages: false,
    });
  });

  it('replace unknown choice values with the default', () => {
    const settings = mergeWithDefaultSettings({
      ui: { textSize: 'gigantic', cardSize: 'large', accentColor: 'neon', density: 'airy', tableView: 'plan' },
    });
    expect(settings.ui).toMatchObject({ textSize: 'medium', cardSize: 'large', accentColor: 'blue', density: 'comfortable', tableView: 'plan' });
  });
});

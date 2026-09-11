import {
  ACCENT_COLORS,
  APP_CONFIG,
  CARD_SCALES,
  CARD_SIZES,
  LAYOUT_DENSITIES,
  TEXT_SCALES,
  TEXT_SIZES,
} from '@/config/app.config';
import { createDefaultUIPreferences } from '@/data/defaults';
import type { ResolvedTheme, Theme, UIPreferences } from '@/types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

/** Applies the theme class (html.dark / html.light) used by theme.css. */
export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.classList.toggle('light', resolved === 'light');
    root.style.colorScheme = resolved;
  }
  return resolved;
}

/** Calls `onChange` when the OS theme changes. Returns an unsubscribe. */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export type AppearancePreferences = Pick<UIPreferences, 'density' | 'textSize' | 'cardSize' | 'accentColor'>;

/**
 * Applies the look preferences on <html>: density (`data-density`), accent
 * color (`data-accent`, values in theme.css), text size (root font size —
 * everything sized in rem scales with it) and card size (`--app-card-scale`).
 */
export function applyAppearance(ui: AppearancePreferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.density = ui.density;
  root.dataset.accent = ui.accentColor;
  root.style.fontSize = `${(TEXT_SCALES[ui.textSize] ?? 1) * 100}%`;
  root.style.setProperty('--app-card-scale', String(CARD_SCALES[ui.cardSize] ?? 1));
}

/* ------------------------------------------------------------------------ *
 * Startup look. Settings arrive from the main process asynchronously, so a
 * copy of the look is kept in localStorage and applied before the first
 * render — the loading screen already shows the chosen theme, accent and
 * size. The saved settings remain the source of truth.
 * ------------------------------------------------------------------------ */

const LOOK_STORAGE_KEY = 'restaurant-pos-look';
const THEMES: readonly Theme[] = ['dark', 'light', 'system'];

export interface RememberedLook extends AppearancePreferences {
  theme: Theme;
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

export function rememberLook(look: RememberedLook): void {
  try {
    const { theme, density, textSize, cardSize, accentColor } = look;
    window.localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ theme, density, textSize, cardSize, accentColor }));
  } catch {
    // Storage blocked or full — only the loading screen's colors are affected.
  }
}

/** Applies the look remembered from the last session; unknown values fall back to the defaults. */
export function applyRememberedLook(): void {
  let stored: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOOK_STORAGE_KEY) ?? 'null');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed as Record<string, unknown>;
  } catch {
    return;
  }
  if (!stored) return;
  const defaults = createDefaultUIPreferences();
  applyTheme(pick(stored.theme, THEMES, APP_CONFIG.defaults.theme));
  applyAppearance({
    density: pick(stored.density, LAYOUT_DENSITIES, defaults.density),
    textSize: pick(stored.textSize, TEXT_SIZES, defaults.textSize),
    cardSize: pick(stored.cardSize, CARD_SIZES, defaults.cardSize),
    accentColor: pick(stored.accentColor, ACCENT_COLORS, defaults.accentColor),
  });
}

export function appearanceChanged(previous: AppearancePreferences, next: AppearancePreferences): boolean {
  return (
    previous.density !== next.density ||
    previous.textSize !== next.textSize ||
    previous.cardSize !== next.cardSize ||
    previous.accentColor !== next.accentColor
  );
}

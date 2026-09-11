import { CARD_SCALES, TEXT_SCALES } from '@/config/app.config';
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

export function appearanceChanged(previous: AppearancePreferences, next: AppearancePreferences): boolean {
  return (
    previous.density !== next.density ||
    previous.textSize !== next.textSize ||
    previous.cardSize !== next.cardSize ||
    previous.accentColor !== next.accentColor
  );
}

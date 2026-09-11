import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { applyTheme, watchSystemTheme } from '@/utils/theme';

/** Re-applies the theme when "System" is selected and the OS theme changes. */
export function useSystemThemeSync(): void {
  const theme = useSettingsStore((state) => state.settings.theme);
  useEffect(() => {
    if (theme !== 'system') return undefined;
    return watchSystemTheme(() => applyTheme('system'));
  }, [theme]);
}

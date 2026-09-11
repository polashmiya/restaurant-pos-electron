import { TEXT_SCALES } from '@/config/app.config';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * The interface scale of Settings → Text size (1 = normal). Everything sized
 * in rem follows it automatically; drawings sized in pixels (SVG charts)
 * multiply their measurements by it.
 */
export function useTextScale(): number {
  return useSettingsStore((state) => TEXT_SCALES[state.settings.ui.textSize] ?? 1);
}

import { TEXT_SIZES } from '@/config/app.config';
import { useSettingsStore } from '@/store/settingsStore';
import type { TextSize } from '@/types';
import { attempt } from './actionRunner';

/** The text size one step larger (+1) or smaller (−1), or normal (0). */
export function nextTextSize(current: TextSize, step: -1 | 0 | 1): TextSize {
  if (step === 0) return 'medium';
  const index = Math.max(TEXT_SIZES.indexOf(current), 0);
  return TEXT_SIZES[Math.min(Math.max(index + step, 0), TEXT_SIZES.length - 1)] ?? current;
}

/** Ctrl + / Ctrl − / Ctrl 0: changes the interface text size (saved like any setting). */
export async function stepTextSize(step: -1 | 0 | 1): Promise<void> {
  const { textSize } = useSettingsStore.getState().settings.ui;
  const next = nextTextSize(textSize, step);
  if (next === textSize) return;
  await attempt('text-size', () => useSettingsStore.getState().updateUI({ textSize: next }));
}

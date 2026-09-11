import { useSettingsStore } from '@/store/settingsStore';

export type SoundEffect = 'add' | 'success' | 'error';

const TONES: Record<SoundEffect, { frequency: number; durationMs: number; type: OscillatorType }[]> = {
  add: [{ frequency: 880, durationMs: 45, type: 'sine' }],
  success: [
    { frequency: 660, durationMs: 90, type: 'sine' },
    { frequency: 990, durationMs: 140, type: 'sine' },
  ],
  error: [{ frequency: 220, durationMs: 180, type: 'square' }],
};

let context: AudioContext | null = null;

/**
 * Short offline beeps generated with Web Audio (no audio files). Only plays
 * when "Sound effects" is enabled in Settings.
 */
export function playSound(effect: SoundEffect): void {
  if (!useSettingsStore.getState().settings.ui.soundEffects) return;
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return;
  try {
    context ??= new AudioContext();
    let start = context.currentTime;
    for (const tone of TONES[effect]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = tone.type;
      oscillator.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.durationMs / 1000);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.durationMs / 1000);
      start += tone.durationMs / 1000;
    }
  } catch {
    // Audio is optional; never interrupt the cashier because of it.
  }
}

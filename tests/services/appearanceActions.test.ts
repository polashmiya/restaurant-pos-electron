import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTextSize, stepTextSize } from '@/services/appearanceActions';
import { applyStoreData } from '@/services/bootstrap';
import { setStorageAdapter } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { copyText } from '@/utils/clipboard';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

describe('text size shortcuts', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = createMemoryStorage();
    setStorageAdapter(storage);
    applyStoreData(storage.data);
  });

  afterEach(() => setStorageAdapter(null));

  it('steps through the sizes and stops at both ends', () => {
    expect(nextTextSize('medium', 1)).toBe('large');
    expect(nextTextSize('large', 1)).toBe('xlarge');
    expect(nextTextSize('xlarge', 1)).toBe('xlarge');
    expect(nextTextSize('medium', -1)).toBe('small');
    expect(nextTextSize('small', -1)).toBe('small');
    expect(nextTextSize('xlarge', 0)).toBe('medium');
  });

  it('saves the new size and scales the interface', async () => {
    await stepTextSize(1);
    expect(storage.data.settings.ui.textSize).toBe('large');
    expect(document.documentElement.style.fontSize).toBe('112.5%');
    await stepTextSize(0);
    expect(storage.data.settings.ui.textSize).toBe('medium');
    expect(useSettingsStore.getState().settings.ui.textSize).toBe('medium');
  });
});

describe('copyText', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
    Reflect.deleteProperty(document, 'execCommand');
  });

  it('uses the Clipboard API when it is allowed', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await copyText('polashmiya2015@gmail.com')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('polashmiya2015@gmail.com');
  });

  it('falls back to the copy command when the Clipboard API is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
      configurable: true,
    });
    let copied = '';
    const execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement | null)?.value ?? '';
      return true;
    });
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    expect(await copyText('polashmiya2015@gmail.com')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(copied).toBe('polashmiya2015@gmail.com');
    expect(document.querySelector('textarea')).toBeNull();
  });
});

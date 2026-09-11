import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutSettings } from '@/components/settings/AboutSettings';
import { applyStoreData } from '@/services/bootstrap';
import { setStorageAdapter } from '@/services/storage';
import { useUIStore } from '@/store/uiStore';
import { createMemoryStorage } from '../helpers/memoryStorage';

describe('About & developer', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  beforeEach(() => {
    const storage = createMemoryStorage();
    setStorageAdapter(storage);
    applyStoreData(storage.data);
    useUIStore.setState({ toasts: [] });
  });

  afterEach(() => {
    cleanup();
    setStorageAdapter(null);
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('shows who developed the application, in the UI language', () => {
    render(<AboutSettings />);
    const card = screen.getByRole('region', { name: 'তৈরি করেছেন' });
    expect(card.textContent).toContain('Md. Polash Miya');
    expect(card.textContent).toContain('সফটওয়্যার ইঞ্জিনিয়ার');
    expect(card.textContent).toContain('polashmiya2015@gmail.com');
    expect(screen.getByRole('region', { name: 'ডেভেলপার টুলস' })).toBeTruthy();
  });

  it('copies the email address', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<AboutSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'ইমেইল কপি করুন' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('polashmiya2015@gmail.com'));
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('settings.about.emailCopied');
  });
});

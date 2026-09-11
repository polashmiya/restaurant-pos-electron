import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { applyStoreData } from '@/services/bootstrap';
import { resetDemoData } from '@/services/dataActions';
import { whenIdle } from '@/services/persistQueue';
import { setStorageAdapter } from '@/services/storage';
import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { makeOrder } from '../helpers/factories';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

let storage: MemoryStorage;

/** Answers the next confirmation dialog. */
function answerConfirm(confirmed: boolean) {
  const unsubscribe = useUIStore.subscribe((state) => {
    const pending = state.confirmQueue[0];
    if (!pending) return;
    unsubscribe();
    queueMicrotask(() => useUIStore.getState().resolveConfirm(pending.id, confirmed));
  });
}

beforeEach(async () => {
  storage = createMemoryStorage({ completedOrders: [makeOrder()] });
  setStorageAdapter(storage);
  applyStoreData(storage.data);
  await useSettingsStore.getState().updateSettings({ language: 'en', theme: 'light' });
  await useMenuStore.getState().deleteItem(useMenuStore.getState().items[0]!.id);
});

afterEach(async () => {
  await whenIdle();
  setStorageAdapter(null);
});

describe('reset demo data', () => {
  it('does nothing unless the warning is confirmed', async () => {
    answerConfirm(false);
    expect(await resetDemoData()).toBe(false);
    expect(storage.data.completedOrders).toHaveLength(1);
    expect(useSettingsStore.getState().settings.language).toBe('en');
  });

  it('clears orders and restores the seed menu and default settings after confirmation', async () => {
    const itemsBefore = useMenuStore.getState().items.length;
    answerConfirm(true);
    expect(await resetDemoData()).toBe(true);

    expect(storage.data.completedOrders).toEqual([]);
    expect(useOrderStore.getState().completedOrders).toEqual([]);
    expect(useMenuStore.getState().items.length).toBe(itemsBefore + 1);
    expect(useSettingsStore.getState().settings.language).toBe('bn');
    expect(useSettingsStore.getState().settings.theme).toBe('dark');
    expect(i18n.language).toBe('bn');
  });
});

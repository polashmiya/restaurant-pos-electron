import { describe, expect, it } from 'vitest';
import { createBrowserStorage } from '@/services/storage';
import { isAppError } from '@/utils/errors';
import { makeOrder } from '../helpers/factories';

describe('browser storage adapter', () => {
  it('initializes seed data once and keeps changes across a "restart"', async () => {
    const first = createBrowserStorage(window.localStorage);
    const initial = await first.getAll();
    expect(initial.settings.language).toBe('bn');
    expect(initial.tables).toHaveLength(20);

    await first.set('settings', { ...initial.settings, language: 'en' });
    await first.append('completedOrders', makeOrder());

    // A new adapter on the same backend simulates an application restart.
    const second = createBrowserStorage(window.localStorage);
    const reloaded = await second.getAll();
    expect(reloaded.settings.language).toBe('en');
    expect(reloaded.completedOrders).toHaveLength(1);
  });

  it('refuses to append the same order twice', async () => {
    const storage = createBrowserStorage(window.localStorage);
    await storage.append('completedOrders', makeOrder());

    await expect(storage.append('completedOrders', makeOrder())).rejects.toSatisfy(isAppError);
    expect((await storage.getAll()).completedOrders).toHaveLength(1);
  });

  it('reset restores demo data and default settings', async () => {
    const storage = createBrowserStorage(window.localStorage);
    const data = await storage.getAll();
    await storage.set('settings', { ...data.settings, language: 'en', theme: 'light' });
    await storage.set('menuItems', []);
    await storage.append('completedOrders', makeOrder());

    const restored = await storage.reset();
    expect(restored.settings.language).toBe('bn');
    expect(restored.settings.theme).toBe('dark');
    expect(restored.menuItems.length).toBeGreaterThanOrEqual(30);
    expect(restored.completedOrders).toEqual([]);
  });
});

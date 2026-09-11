import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyStoreData } from '@/services/bootstrap';
import { setStorageAdapter } from '@/services/storage';
import { useMenuStore } from '@/store/menuStore';
import { useTableStore } from '@/store/tableStore';
import { isAppError } from '@/utils/errors';
import { makeMenuItem } from '../helpers/factories';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

let storage: MemoryStorage;

beforeEach(() => {
  storage = createMemoryStorage();
  setStorageAdapter(storage);
  applyStoreData(storage.data);
});

afterEach(() => setStorageAdapter(null));

describe('menu management', () => {
  it('adds and edits bilingual items and persists them', async () => {
    const item = makeMenuItem({ id: 'item-new', code: 'NEW-001', categoryId: 'cat-burgers', name: { bn: 'নতুন বার্গার', en: 'New Burger' } });
    await useMenuStore.getState().saveItem(item);
    expect(storage.data.menuItems.some((entry) => entry.id === 'item-new')).toBe(true);

    await useMenuStore.getState().saveItem({ ...item, price: 299 });
    expect(storage.data.menuItems.find((entry) => entry.id === 'item-new')?.price).toBe(299);
  });

  it('rejects a duplicate item code', async () => {
    const duplicate = makeMenuItem({ id: 'item-dup', code: 'bur-001' });
    await expect(useMenuStore.getState().saveItem(duplicate)).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.messageKey === 'settings.menu.codeExists',
    );
  });

  it('toggles availability (persisted, reflected on the POS)', async () => {
    const burger = useMenuStore.getState().items.find((item) => item.code === 'BUR-001')!;
    await useMenuStore.getState().setItemAvailability(burger.id, false);
    expect(storage.data.menuItems.find((item) => item.id === burger.id)?.isAvailable).toBe(false);
  });

  it('refuses to delete a category that still has items', async () => {
    await expect(useMenuStore.getState().deleteCategory('cat-burgers')).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.messageKey === 'settings.menu.categoryHasItems',
    );
    await useMenuStore.getState().saveCategory({ id: 'cat-empty', name: { bn: 'খালি', en: 'Empty' }, icon: 'general', color: 'blue', sortOrder: 9 });
    await useMenuStore.getState().deleteCategory('cat-empty');
    expect(storage.data.categories.some((category) => category.id === 'cat-empty')).toBe(false);
  });
});

describe('table management', () => {
  it('adds a table and rejects duplicate numbers or names', async () => {
    await useTableStore.getState().saveTable({ id: 'table-21', number: 21, name: 'VIP-1', capacity: 10, status: 'available' });
    expect(storage.data.tables).toHaveLength(21);

    await expect(
      useTableStore.getState().saveTable({ id: 'table-x', number: 21, name: 'X', capacity: 2, status: 'available' }),
    ).rejects.toSatisfy(isAppError);
    await expect(
      useTableStore.getState().saveTable({ id: 'table-y', number: 99, name: 'vip-1', capacity: 2, status: 'available' }),
    ).rejects.toSatisfy(isAppError);
  });

  it('refuses to delete a table in use', async () => {
    const table = useTableStore.getState().tables[0]!;
    await useTableStore.getState().reserve(table.id, { guestName: 'A', time: '20:00', guests: 2, createdAt: '' });
    await expect(useTableStore.getState().deleteTable(table.id)).rejects.toSatisfy(isAppError);
    expect(storage.data.tables).toHaveLength(20);
  });
});

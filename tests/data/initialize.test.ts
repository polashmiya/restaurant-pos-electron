import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from '@/data/defaults';
import { prepareStoreData } from '@/data/initialize';
import { createSeedCategories, createSeedMenuItems, createSeedTables } from '@/data/seed';
import { makeOrder, makeShift } from '../helpers/factories';

const NOW = new Date('2026-09-10T10:00:00.000Z');

describe('prepareStoreData (initializeStore)', () => {
  it('seeds demo data and defaults on first launch', () => {
    const result = prepareStoreData({}, NOW);

    expect(result.seeded).toBe(true);
    expect(result.data.categories).toHaveLength(8);
    expect(result.data.menuItems.length).toBeGreaterThanOrEqual(30);
    expect(result.data.tables).toHaveLength(20);
    expect(result.data.settings.language).toBe('bn');
    expect(result.data.settings.theme).toBe('dark');
    expect(result.data.settings.currency).toBe('BDT');
    expect(result.data.settings.currencySymbol).toBe('৳');
    expect(result.data.settings.defaultTaxRate).toBe(5);
    expect(result.data.settings.numberFormat).toBe('western');
    expect(result.data.openOrders).toEqual([]);
    expect(result.data.completedOrders).toEqual([]);
    expect(result.data.shifts).toEqual([]);
    expect(result.changes.menuItems).toBeDefined();
    expect(result.data.meta.seededAt).toBe(NOW.toISOString());
  });

  it('seed menu items are bilingual, priced in BDT and reference real categories', () => {
    const categoryIds = new Set(createSeedCategories().map((category) => category.id));
    const items = createSeedMenuItems();
    const codes = new Set(items.map((item) => item.code));

    expect(codes.size).toBe(items.length);
    for (const item of items) {
      expect(item.name.bn.trim()).not.toBe('');
      expect(item.name.en.trim()).not.toBe('');
      expect(item.price).toBeGreaterThan(0);
      expect(categoryIds.has(item.categoryId)).toBe(true);
    }
  });

  it('never overwrites existing user data during a normal start', () => {
    const settings = { ...createDefaultSettings(), language: 'en' as const, theme: 'light' as const };
    const menuItems = createSeedMenuItems().slice(0, 3).map((item) => ({ ...item, price: item.price + 1 }));
    const existing = {
      settings,
      categories: createSeedCategories(),
      menuItems,
      tables: createSeedTables(),
      openOrders: [],
      completedOrders: [makeOrder()],
      shifts: [],
      orderCounter: { date: '20260910', sequence: 1 },
      session: {},
      meta: { schemaVersion: 1, seededAt: '2026-01-01T00:00:00.000Z' },
    };

    const result = prepareStoreData(existing, NOW);

    expect(result.seeded).toBe(false);
    expect(result.data.settings.language).toBe('en');
    expect(result.data.settings.theme).toBe('light');
    expect(result.data.menuItems).toEqual(menuItems);
    expect(result.data.completedOrders).toHaveLength(1);
    expect(result.changes.menuItems).toBeUndefined();
    expect(result.changes.settings).toBeUndefined();
    expect(result.changes.completedOrders).toBeUndefined();
    expect(result.data.meta.seededAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('respects an intentionally empty menu instead of re-seeding it', () => {
    const result = prepareStoreData({ menuItems: [], categories: [], tables: [] }, NOW);
    expect(result.data.menuItems).toEqual([]);
    expect(result.data.categories).toEqual([]);
    expect(result.data.tables).toEqual([]);
  });

  it('fills in settings added by newer versions while keeping user choices', () => {
    const partial = { language: 'en', theme: 'light', name: { bn: 'আমার দোকান', en: 'My Shop' } };
    const result = prepareStoreData({ settings: partial }, NOW);

    expect(result.data.settings.language).toBe('en');
    expect(result.data.settings.name.en).toBe('My Shop');
    expect(result.data.settings.printer.paperWidth).toBe('80mm');
    expect(result.data.settings.ui.showItemImages).toBe(true);
    expect(result.changes.settings).toBeDefined();
  });

  it('removes open orders that were already completed (interrupted completion)', () => {
    const order = makeOrder({ id: 'order-x', status: 'completed' });
    const stillOpen = makeOrder({ id: 'order-y', status: 'draft', payment: undefined, completedAt: undefined });
    const result = prepareStoreData(
      { openOrders: [{ ...order, status: 'draft' }, stillOpen], completedOrders: [order] },
      NOW,
    );

    expect(result.data.openOrders.map((entry) => entry.id)).toEqual(['order-y']);
    expect(result.repairs.length).toBeGreaterThan(0);
  });

  it('releases tables whose active order no longer exists and re-links orphaned table orders', () => {
    const tables = createSeedTables();
    tables[0] = { ...tables[0]!, status: 'occupied', activeOrderId: 'missing-order' };
    const tableOrder = makeOrder({
      id: 'order-t5',
      orderType: 'dine-in',
      tableId: tables[4]!.id,
      status: 'draft',
      payment: undefined,
      completedAt: undefined,
    });

    const result = prepareStoreData({ tables, openOrders: [tableOrder] }, NOW);

    expect(result.data.tables[0]?.status).toBe('available');
    expect(result.data.tables[0]?.activeOrderId).toBeUndefined();
    expect(result.data.tables[4]?.status).toBe('occupied');
    expect(result.data.tables[4]?.activeOrderId).toBe('order-t5');
  });

  it('recalculates the open shift totals from its completed orders', () => {
    const shift = makeShift({ totalSales: 0, orderCount: 0 });
    const orders = [
      makeOrder({ id: 'a', shiftId: shift.id, total: 945, tax: 45, discount: 100 }),
      makeOrder({
        id: 'b',
        shiftId: shift.id,
        total: 262.5,
        tax: 12.5,
        discount: 0,
        payment: { method: 'card', amountPaid: 262.5, change: 0, paidAt: NOW.toISOString() },
      }),
    ];

    const result = prepareStoreData({ shifts: [shift], completedOrders: orders }, NOW);
    const current = result.data.shifts[0];

    expect(current?.orderCount).toBe(2);
    expect(current?.totalSales).toBe(1207.5);
    expect(current?.cashSales).toBe(945);
    expect(current?.cardSales).toBe(262.5);
    expect(current?.taxCollected).toBe(57.5);
    expect(current?.discountTotal).toBe(100);
  });

  it('keeps only one open shift', () => {
    const result = prepareStoreData(
      {
        shifts: [
          makeShift({ id: 'old', openedAt: '2026-09-09T07:00:00.000Z' }),
          makeShift({ id: 'new', openedAt: '2026-09-10T07:00:00.000Z' }),
        ],
      },
      NOW,
    );
    const open = result.data.shifts.filter((shift) => shift.status === 'open');
    expect(open.map((shift) => shift.id)).toEqual(['new']);
  });

  it('seeds every demo menu item with a bundled photo', () => {
    const items = createSeedMenuItems();
    expect(items.every((item) => item.image === `images/menu/${item.code.toLowerCase()}.webp`)).toBe(true);
  });

  it('v2 migration adds bundled photos to untouched demo items only', () => {
    const seed = createSeedMenuItems();
    const withoutImages = seed.map(({ image: _image, ...item }) => item);
    const custom = { ...withoutImages[1]!, image: 'data:image/webp;base64,AAAA' };
    const recoded = { ...withoutImages[2]!, code: 'MY-001' };
    const own = { ...withoutImages[3]!, id: 'item-mine' };
    const menuItems = [withoutImages[0]!, custom, recoded, own];

    const result = prepareStoreData({ menuItems, meta: { schemaVersion: 1 } }, NOW);

    expect(result.data.menuItems[0]?.image).toBe(seed[0]?.image);
    expect(result.data.menuItems[1]?.image).toBe('data:image/webp;base64,AAAA');
    expect(result.data.menuItems[2]?.image).toBeUndefined();
    expect(result.data.menuItems[3]?.image).toBeUndefined();
    expect(result.changes.menuItems).toEqual(result.data.menuItems);
    expect(result.data.meta.schemaVersion).toBe(2);

    // Already migrated data is left alone.
    const again = prepareStoreData({ ...result.data }, NOW);
    expect(again.changes.menuItems).toBeUndefined();
  });

  it('clears a session that points at a missing order', () => {
    const result = prepareStoreData({ session: { currentOrderId: 'gone' }, openOrders: [] }, NOW);
    expect(result.data.session).toEqual({});
  });
});

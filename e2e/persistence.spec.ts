import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createUserDataDir, launchApp, removeUserDataDir } from './helpers';

test('electron-store data is seeded once and survives an application restart', async () => {
  const userDataDir = createUserDataDir();
  try {
    // First launch: seed data is created.
    const first = await launchApp(userDataDir);
    const seeded = await first.window.evaluate(async () => {
      const api = window.electronAPI!;
      const data = await api.store.getAll();
      return {
        categories: data.categories.length,
        menuItems: data.menuItems.length,
        tables: data.tables.length,
        language: data.settings.language,
        theme: data.settings.theme,
        currency: data.settings.currency,
        taxRate: data.settings.defaultTaxRate,
      };
    });
    expect(seeded).toEqual({
      categories: 8,
      menuItems: expect.any(Number),
      tables: 20,
      language: 'bn',
      theme: 'dark',
      currency: 'BDT',
      taxRate: 5,
    });
    expect(seeded.menuItems).toBeGreaterThanOrEqual(30);

    // Change settings, menu, tables, orders and shifts.
    await first.window.evaluate(async () => {
      const api = window.electronAPI!;
      const data = await api.store.getAll();
      const now = new Date().toISOString();
      const [firstItem] = data.menuItems;
      await api.store.setMany({
        settings: { ...data.settings, language: 'en', theme: 'light', defaultTaxRate: 7.5 },
        menuItems: data.menuItems.map((item) => (item.id === firstItem?.id ? { ...item, price: 999 } : item)),
        tables: data.tables.map((table) => (table.number === 5 ? { ...table, status: 'reserved' as const } : table)),
      });
      await api.store.append('shifts', {
        id: 'shift-e2e',
        openedAt: now,
        cashierName: 'E2E',
        openingCash: 500,
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        mobileSales: 0,
        taxCollected: 0,
        discountTotal: 0,
        orderCount: 0,
        status: 'closed',
        closedAt: now,
      });
      await api.store.append('completedOrders', {
        id: 'order-e2e',
        orderNumber: 'ORD-20260910-0001',
        orderType: 'takeaway',
        items: [
          {
            id: 'line-1',
            menuItemId: firstItem!.id,
            name: firstItem!.name,
            price: 250,
            quantity: 2,
          },
        ],
        taxRate: 5,
        subtotal: 500,
        discount: 0,
        tax: 25,
        total: 525,
        status: 'completed',
        language: 'en',
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        payment: { method: 'cash', amountPaid: 600, change: 75, paidAt: now },
        kotCount: 0,
      });
    });
    await first.app.close();

    // Data files exist on disk.
    expect(fs.existsSync(path.join(userDataDir, 'pos-settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(userDataDir, 'pos-catalog.json'))).toBe(true);
    expect(fs.existsSync(path.join(userDataDir, 'pos-operations.json'))).toBe(true);
    expect(fs.readdirSync(path.join(userDataDir, 'orders')).some((file) => file.startsWith('pos-orders-'))).toBe(true);

    // Second launch: nothing was re-seeded or lost.
    const second = await launchApp(userDataDir);
    const reloaded = await second.window.evaluate(async () => {
      const data = await window.electronAPI!.store.getAll();
      return {
        language: data.settings.language,
        theme: data.settings.theme,
        taxRate: data.settings.defaultTaxRate,
        firstPrice: data.menuItems[0]?.price,
        table5: data.tables.find((table) => table.number === 5)?.status,
        orders: data.completedOrders.map((order) => order.id),
        shifts: data.shifts.map((shift) => shift.id),
      };
    });
    await second.app.close();

    expect(reloaded).toEqual({
      language: 'en',
      theme: 'light',
      taxRate: 7.5,
      firstPrice: 999,
      table5: 'reserved',
      orders: ['order-e2e'],
      shifts: ['shift-e2e'],
    });
  } finally {
    removeUserDataDir(userDataDir);
  }
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStoreData } from '@/services/bootstrap';
import { startDraftSync } from '@/services/draftSync';
import {
  assignTableToCurrentOrder,
  changeOrderType,
  clearCurrentOrder,
  completeCurrentOrder,
  holdCurrentOrder,
  markCurrentOrderSentToKitchen,
  openOrder,
  startNewOrder,
} from '@/services/orderWorkflow';
import { whenIdle } from '@/services/persistQueue';
import { setStorageAdapter } from '@/services/storage';
import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { getCurrentTotals, usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { selectCurrentShift, useShiftStore } from '@/store/shiftStore';
import { useTableStore } from '@/store/tableStore';
import type { MenuItem } from '@/types';
import { isAppError } from '@/utils/errors';
import { createEmptyDraft } from '@/utils/orderHelpers';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

let storage: MemoryStorage;

function menuItem(code: string): MenuItem {
  const item = useMenuStore.getState().items.find((entry) => entry.code === code);
  if (!item) throw new Error(`Seed item ${code} missing`);
  return item;
}

function table(name: string) {
  const found = useTableStore.getState().tables.find((entry) => entry.name === name);
  if (!found) throw new Error(`Table ${name} missing`);
  return found;
}

async function openShift() {
  await useShiftStore.getState().openShift({ cashierName: 'Rahim', openingCash: 1000 });
}

beforeEach(() => {
  storage = createMemoryStorage();
  setStorageAdapter(storage);
  usePosStore.setState({ draft: createEmptyDraft('takeaway'), isProcessingPayment: false });
  applyStoreData(storage.data);
});

afterEach(async () => {
  await whenIdle();
  setStorageAdapter(null);
});

describe('end-to-end cashier workflow (master spec §80)', () => {
  it('dine-in at table 05 → items → note → discount → cash payment → saved, table freed, shift updated', async () => {
    await openShift();
    await changeOrderType('dine-in');
    await assignTableToCurrentOrder(table('05').id);

    expect(table('05').status).toBe('occupied');
    expect(table('05').activeOrderId).toBe(usePosStore.getState().draft.id);

    const pos = usePosStore.getState();
    pos.addItem(menuItem('BUR-001')); // Chicken Burger 250
    pos.addItem(menuItem('APP-002')); // French Fries 150
    const burgerLine = usePosStore.getState().draft.items[0]!;
    pos.incrementItem(burgerLine.id); // 2 × 250
    pos.setItemNote(burgerLine.id, ['no-onion'], '');
    pos.setDiscount({ type: 'percentage', value: 10 });

    const totals = getCurrentTotals();
    expect(totals.subtotal).toBe(650);
    expect(totals.discount).toBe(65);
    expect(totals.tax).toBe(29.25);
    expect(totals.total).toBe(614.25);

    const { order, partialFailure } = await completeCurrentOrder({ method: 'cash', amountReceived: 1000 });

    expect(partialFailure).toBe(false);
    expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(order.status).toBe('completed');
    expect(order.tableName).toBe('05');
    expect(order.language).toBe('bn');
    expect(order.payment).toMatchObject({ method: 'cash', amountPaid: 1000, change: 385.75 });
    expect(order.items[0]?.note?.en).toBe('No onions');

    // Persisted history, freed table, updated shift, cleared cart.
    expect(storage.data.completedOrders.map((entry) => entry.id)).toEqual([order.id]);
    expect(table('05').status).toBe('available');
    expect(storage.data.tables.find((entry) => entry.name === '05')?.status).toBe('available');
    const shift = selectCurrentShift(useShiftStore.getState());
    expect(shift).toMatchObject({ orderCount: 1, totalSales: 614.25, cashSales: 614.25, taxCollected: 29.25, discountTotal: 65 });
    expect(storage.data.shifts[0]?.totalSales).toBe(614.25);
    expect(usePosStore.getState().draft.items).toEqual([]);
    expect(storage.data.openOrders).toEqual([]);
  });

  it('records card and mobile payments as exact with zero change', async () => {
    await openShift();
    usePosStore.getState().addItem(menuItem('BEV-002'));
    const card = await completeCurrentOrder({ method: 'card', amountReceived: null, reference: 'APPR-77' });
    expect(card.order.payment).toMatchObject({ method: 'card', amountPaid: 157.5, change: 0, reference: 'APPR-77' });

    usePosStore.getState().addItem(menuItem('BEV-002'));
    const mobile = await completeCurrentOrder({ method: 'mobile', amountReceived: null });
    expect(mobile.order.payment).toMatchObject({ method: 'mobile', amountPaid: 157.5, change: 0 });

    const shift = selectCurrentShift(useShiftStore.getState());
    expect(shift?.cardSales).toBe(157.5);
    expect(shift?.mobileSales).toBe(157.5);
    expect(shift?.orderCount).toBe(2);
  });
});

describe('payment validation and transaction safety', () => {
  it('rejects insufficient cash and keeps the cart', async () => {
    await openShift();
    usePosStore.getState().addItem(menuItem('BUR-001'));

    await expect(completeCurrentOrder({ method: 'cash', amountReceived: 100 })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.messageKey === 'validation.insufficientCash',
    );
    expect(usePosStore.getState().draft.items).toHaveLength(1);
    expect(storage.data.completedOrders).toHaveLength(0);
  });

  it('requires a table for dine-in, items in the cart and an open shift', async () => {
    const reason = async () => {
      try {
        await completeCurrentOrder({ method: 'card', amountReceived: null });
        return null;
      } catch (error) {
        return isAppError(error) ? error.messageKey : 'unknown';
      }
    };
    expect(await reason()).toBe('validation.cartEmpty');

    usePosStore.getState().addItem(menuItem('BUR-001'));
    expect(await reason()).toBe('validation.shiftRequired');

    await openShift();
    await changeOrderType('dine-in');
    expect(await reason()).toBe('validation.tableRequired');
  });

  it('keeps the order in the cart when saving fails (no half-completed transaction)', async () => {
    await openShift();
    await changeOrderType('dine-in');
    await assignTableToCurrentOrder(table('03').id);
    usePosStore.getState().addItem(menuItem('RICE-002'));
    await whenIdle();

    storage.failOn('append');
    await expect(completeCurrentOrder({ method: 'cash', amountReceived: 500 })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.messageKey === 'errors.saveFailed',
    );

    expect(usePosStore.getState().draft.items).toHaveLength(1);
    expect(usePosStore.getState().isProcessingPayment).toBe(false);
    expect(table('03').status).toBe('occupied');
    expect(storage.data.completedOrders).toHaveLength(0);
    expect(selectCurrentShift(useShiftStore.getState())?.orderCount).toBe(0);

    storage.failOn('append', false);
    const result = await completeCurrentOrder({ method: 'cash', amountReceived: 500 });
    expect(storage.data.completedOrders).toHaveLength(1);
    expect(result.order.total).toBe(472.5);
  });

  it('prevents duplicate completion from a double click', async () => {
    await openShift();
    usePosStore.getState().addItem(menuItem('BUR-001'));

    const first = completeCurrentOrder({ method: 'cash', amountReceived: 500 });
    const second = completeCurrentOrder({ method: 'cash', amountReceived: 500 });

    await expect(second).rejects.toSatisfy(isAppError);
    await first;
    expect(storage.data.completedOrders).toHaveLength(1);
    expect(useOrderStore.getState().completedOrders).toHaveLength(1);
  });
});

describe('tables (master spec §59, §97)', () => {
  it('reopens an existing table order instead of creating a duplicate', async () => {
    await openShift();
    await startNewOrder({ tableId: table('05').id });
    usePosStore.getState().addItem(menuItem('BUR-001'));
    const tableOrderId = usePosStore.getState().draft.id;
    await whenIdle();

    // Serve another customer, then come back to table 05.
    await startNewOrder({ orderType: 'takeaway' });
    expect(table('05').activeOrderId).toBe(tableOrderId);
    await expect(startNewOrder({ tableId: table('05').id })).rejects.toSatisfy(isAppError);

    await openOrder(tableOrderId);
    usePosStore.getState().addItem(menuItem('APP-002'));
    expect(usePosStore.getState().draft.items).toHaveLength(2);

    await completeCurrentOrder({ method: 'card', amountReceived: null });
    expect(table('05').status).toBe('available');
    expect(storage.data.completedOrders).toHaveLength(1);
    expect(storage.data.openOrders).toHaveLength(0);
  });

  it('moves an order to another table and frees the old one', async () => {
    await startNewOrder({ tableId: table('01').id });
    await assignTableToCurrentOrder(table('02').id);
    expect(table('01').status).toBe('available');
    expect(table('02').status).toBe('occupied');
  });

  it('frees the table when switching a dine-in order to takeaway', async () => {
    await startNewOrder({ tableId: table('07').id });
    await changeOrderType('takeaway');
    expect(table('07').status).toBe('available');
    expect(usePosStore.getState().draft.tableId).toBeUndefined();
  });

  it('seating guests at a reserved table clears the reservation', async () => {
    await useTableStore.getState().reserve(table('08').id, {
      guestName: 'Karim',
      time: '19:30',
      guests: 4,
      createdAt: new Date().toISOString(),
    });
    expect(table('08').status).toBe('reserved');

    await startNewOrder({ tableId: table('08').id });
    expect(table('08').status).toBe('occupied');
    expect(table('08').reservation).toBeUndefined();
    // The party size of the reservation becomes the order's guest count.
    expect(usePosStore.getState().draft.guests).toBe(4);
  });

  it('keeps the guest count of a table order through saving, reopening and payment', async () => {
    await openShift();
    await startNewOrder({ tableId: table('03').id });
    expect(usePosStore.getState().draft.guests).toBeUndefined();

    usePosStore.getState().setGuests(3);
    usePosStore.getState().addItem(menuItem('BUR-001'));
    const tableOrderId = usePosStore.getState().draft.id;
    await startNewOrder({ orderType: 'takeaway' });
    expect(storage.data.openOrders.find((order) => order.id === tableOrderId)?.guests).toBe(3);

    await openOrder(tableOrderId);
    expect(usePosStore.getState().draft.guests).toBe(3);
    const { order } = await completeCurrentOrder({ method: 'card', amountReceived: null });
    expect(order.guests).toBe(3);
  });

  it('a takeaway order never records guests', async () => {
    await startNewOrder({ tableId: table('06').id });
    usePosStore.getState().setGuests(2);
    usePosStore.getState().addItem(menuItem('BUR-001'));
    await changeOrderType('takeaway');
    await whenIdle();
    const saved = storage.data.openOrders.find((order) => order.id === usePosStore.getState().draft.id);
    expect(saved?.orderType).toBe('takeaway');
    expect(saved?.guests).toBeUndefined();
  });

  it('marks a table as waiting for bill', async () => {
    await startNewOrder({ tableId: table('10').id });
    usePosStore.getState().addItem(menuItem('BUR-001'));
    await useTableStore.getState().setWaitingForBill(table('10').id, true);
    expect(table('10').status).toBe('waiting');
  });
});

describe('hold, resume and clear', () => {
  it('holds an order with a persisted number and resumes it later', async () => {
    usePosStore.getState().addItem(menuItem('PIZ-001'));
    const held = await holdCurrentOrder();

    expect(held.status).toBe('held');
    expect(held.orderNumber).toMatch(/^ORD-/);
    expect(storage.data.openOrders.find((order) => order.id === held.id)?.status).toBe('held');
    expect(usePosStore.getState().draft.items).toEqual([]);

    await openOrder(held.id);
    expect(usePosStore.getState().draft.id).toBe(held.id);
    expect(usePosStore.getState().draft.items[0]?.menuItemId).toBe(menuItem('PIZ-001').id);
    expect(storage.data.openOrders.find((order) => order.id === held.id)?.status).toBe('draft');
  });

  it('auto-holds the order on screen when switching to another order', async () => {
    usePosStore.getState().addItem(menuItem('BUR-002'));
    const firstId = usePosStore.getState().draft.id;
    const result = await startNewOrder();

    expect(result.heldPrevious).toBe(true);
    expect(useOrderStore.getState().openOrders.find((order) => order.id === firstId)?.status).toBe('held');
  });

  it('clearing an order that was sent to the kitchen records it as cancelled', async () => {
    usePosStore.getState().addItem(menuItem('GRL-001'));
    await markCurrentOrderSentToKitchen(usePosStore.getState().draft.items);
    const { cancelled } = await clearCurrentOrder();

    expect(cancelled).toBe(true);
    expect(storage.data.completedOrders[0]?.status).toBe('cancelled');
  });

  it('clearing an untouched order leaves no trace', async () => {
    usePosStore.getState().addItem(menuItem('GRL-001'));
    const { cancelled } = await clearCurrentOrder();
    expect(cancelled).toBe(false);
    expect(storage.data.completedOrders).toHaveLength(0);
    expect(storage.data.openOrders).toHaveLength(0);
  });
});

describe('automatic draft saving and restart recovery', () => {
  it('saves the order in progress and restores it after a restart', async () => {
    vi.useFakeTimers();
    const stop = startDraftSync();
    try {
      usePosStore.getState().addItem(menuItem('RICE-001'));
      usePosStore.getState().addItem(menuItem('BEV-004'));
      await vi.advanceTimersByTimeAsync(400);
      await whenIdle();

      const saved = storage.data.openOrders;
      expect(saved).toHaveLength(1);
      expect(saved[0]?.items).toHaveLength(2);
      expect(storage.data.session.currentOrderId).toBe(saved[0]?.id);

      // Simulated restart.
      usePosStore.setState({ draft: { ...usePosStore.getState().draft, items: [] } });
      applyStoreData(structuredClone(storage.data));
      expect(usePosStore.getState().draft.items.map((item) => item.code)).toEqual(['RICE-001', 'BEV-004']);
    } finally {
      stop();
      vi.useRealTimers();
    }
  });
});

describe('language switching keeps the application state', () => {
  it('Bangla → English → Bangla does not touch the cart, tables or orders', async () => {
    await startNewOrder({ tableId: table('04').id });
    usePosStore.getState().addItem(menuItem('BUR-001'));
    usePosStore.getState().setDiscount({ type: 'fixed', value: 20 });
    const before = structuredClone(usePosStore.getState().draft);
    const tablesBefore = structuredClone(useTableStore.getState().tables);

    await useSettingsStore.getState().setLanguage('en');
    expect(usePosStore.getState().draft).toEqual(before);
    await useSettingsStore.getState().setLanguage('bn');
    expect(usePosStore.getState().draft).toEqual(before);
    expect(useTableStore.getState().tables).toEqual(tablesBefore);

    await openShift();
    await useSettingsStore.getState().setLanguage('en');
    const { order } = await completeCurrentOrder({ method: 'card', amountReceived: null });
    expect(order.language).toBe('en');
  });
});

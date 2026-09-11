import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@/config/app.config';
import { applyStoreData } from '@/services/bootstrap';
import { whenIdle } from '@/services/persistQueue';
import { loadSampleSales, removeSampleSales } from '@/services/sampleSalesActions';
import { setStorageAdapter } from '@/services/storage';
import { useOrderStore } from '@/store/orderStore';
import { useShiftStore } from '@/store/shiftStore';
import { useUIStore } from '@/store/uiStore';
import { makeOrder, makeShift } from '../helpers/factories';
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

const realOrder = makeOrder({ id: 'real-1', orderNumber: 'ORD-20260910-0001' });
const realShift = makeShift({ id: 'real-shift' });

beforeEach(() => {
  storage = createMemoryStorage({ completedOrders: [realOrder], shifts: [realShift] });
  setStorageAdapter(storage);
  applyStoreData(storage.data);
});

afterEach(async () => {
  await whenIdle();
  setStorageAdapter(null);
});

describe('sample sales', () => {
  it('does nothing unless confirmed', async () => {
    answerConfirm(false);
    expect(await loadSampleSales()).toBe(false);
    expect(storage.data.completedOrders).toHaveLength(1);
  });

  it('adds flagged sample orders and shifts next to real data, then removes only them', async () => {
    answerConfirm(true);
    expect(await loadSampleSales()).toBe(true);

    const saved = storage.data.completedOrders;
    const sample = saved.filter((order) => order.sample);
    expect(sample.length).toBeGreaterThan(100);
    expect(saved).toContainEqual(realOrder);
    expect(storage.data.shifts.filter((shift) => shift.sample)).toHaveLength(APP_CONFIG.reports.sampleDays);
    expect(storage.data.shifts).toContainEqual(realShift);
    expect(useOrderStore.getState().completedOrders).toHaveLength(saved.length);
    expect(useShiftStore.getState().shifts).toHaveLength(APP_CONFIG.reports.sampleDays + 1);

    // Loading again replaces the previous sample instead of doubling it.
    answerConfirm(true);
    await loadSampleSales();
    expect(storage.data.shifts.filter((shift) => shift.sample)).toHaveLength(APP_CONFIG.reports.sampleDays);

    answerConfirm(true);
    expect(await removeSampleSales()).toBe(true);
    expect(storage.data.completedOrders).toEqual([realOrder]);
    expect(storage.data.shifts).toEqual([realShift]);
    expect(useOrderStore.getState().completedOrders).toEqual([realOrder]);
  });

  it('keeps the stores unchanged when saving fails', async () => {
    storage.failOn('setMany');
    answerConfirm(true);
    expect(await loadSampleSales()).toBe(false);
    expect(useOrderStore.getState().completedOrders).toEqual([realOrder]);
    expect(useShiftStore.getState().shifts).toEqual([realShift]);
  });
});

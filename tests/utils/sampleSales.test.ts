import { describe, expect, it } from 'vitest';
import { createSeedMenuItems, createSeedTables } from '@/data/seed';
import { isOrder, isShift } from '@/data/validators';
import { calculateOrderTotals } from '@/utils/calculations';
import { getOrderTimestamp } from '@/utils/orderFilters';
import { generateSampleSales, type SampleSalesInput } from '@/utils/sampleSales';
import { computeShiftTotals, shiftTotalsEqual } from '@/utils/shiftMath';

const NOW = new Date(2026, 8, 10, 15, 0);

function input(overrides: Partial<SampleSalesInput> = {}): SampleSalesInput {
  return {
    menuItems: createSeedMenuItems(),
    tables: createSeedTables(),
    taxRate: 5,
    language: 'bn',
    existingOrderNumbers: new Set(),
    now: NOW,
    days: 30,
    seed: 42,
    ...overrides,
  };
}

describe('generateSampleSales', () => {
  const result = generateSampleSales(input());

  it('creates realistic, valid history for the days before today only', () => {
    expect(result.shifts).toHaveLength(30);
    expect(result.orders.length).toBeGreaterThan(30 * 14);
    const startOfToday = new Date(2026, 8, 10).toISOString();
    const firstDay = new Date(2026, 7, 11).toISOString();
    for (const order of result.orders) {
      expect(isOrder(order), order.id).toBe(true);
      expect(order.sample).toBe(true);
      expect(getOrderTimestamp(order) < startOfToday).toBe(true);
      expect(getOrderTimestamp(order) >= firstDay).toBe(true);
      expect(order.createdAt <= getOrderTimestamp(order)).toBe(true);
    }
    for (const shift of result.shifts) {
      expect(isShift(shift)).toBe(true);
      expect(shift.status).toBe('closed');
      expect(shift.sample).toBe(true);
    }
  });

  it('computes every order with the real order math and only sells available items', () => {
    const unavailable = new Set(createSeedMenuItems().filter((item) => !item.isAvailable).map((item) => item.id));
    for (const order of result.orders.slice(0, 80)) {
      const totals = calculateOrderTotals(order.items, order.discountInput, order.taxRate);
      expect([order.subtotal, order.discount, order.tax, order.total]).toEqual([
        totals.subtotal,
        totals.discount,
        totals.tax,
        totals.total,
      ]);
      expect(order.items.some((item) => unavailable.has(item.menuItemId))).toBe(false);
      if (order.status === 'completed') expect(order.payment!.amountPaid).toBeGreaterThanOrEqual(order.total);
      if (order.orderType === 'dine-in') expect(order.tableName).toBeTruthy();
      if (order.orderType === 'delivery') expect(order.customer?.address).toBeTruthy();
    }
  });

  it('keeps each sample shift consistent with its orders', () => {
    for (const shift of result.shifts) {
      expect(shiftTotalsEqual(shift, computeShiftTotals(result.orders, shift.id))).toBe(true);
    }
  });

  it('mixes order types, payments, discounts and a few cancellations', () => {
    const types = new Set(result.orders.map((order) => order.orderType));
    const methods = new Set(result.orders.flatMap((order) => (order.payment ? [order.payment.method] : [])));
    expect(types).toEqual(new Set(['dine-in', 'takeaway', 'delivery']));
    expect(methods).toEqual(new Set(['cash', 'card', 'mobile']));
    expect(result.orders.some((order) => order.discount > 0)).toBe(true);
    const cancelled = result.orders.filter((order) => order.status === 'cancelled').length;
    expect(cancelled).toBeGreaterThan(0);
    expect(cancelled).toBeLessThan(result.orders.length * 0.1);
  });

  it('never reuses an existing order number and is deterministic for a seed', () => {
    const taken = new Set(['ORD-20260909-0001', 'ORD-20260909-0002']);
    const next = generateSampleSales(input({ existingOrderNumbers: taken }));
    const numbers = next.orders.map((order) => order.orderNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.some((number) => taken.has(number))).toBe(false);

    const again = generateSampleSales(input());
    expect(again.orders.map((order) => order.total)).toEqual(result.orders.map((order) => order.total));
  });

  it('returns nothing without sellable menu items and works without tables', () => {
    expect(generateSampleSales(input({ menuItems: [] }))).toEqual({ orders: [], shifts: [] });
    const noTables = generateSampleSales(input({ tables: [], days: 3 }));
    expect(noTables.orders.every((order) => order.orderType !== 'dine-in')).toBe(true);
  });
});

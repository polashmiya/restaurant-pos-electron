import { describe, expect, it } from 'vitest';
import {
  applyOrderToShift,
  calculateAverageOrder,
  calculateCashDifference,
  calculateExpectedCash,
  computeShiftTotals,
} from '@/utils/shiftMath';
import { makeOrder, makeShift } from '../helpers/factories';

describe('shift calculations', () => {
  it('adds a completed order to the shift totals', () => {
    const shift = applyOrderToShift(makeShift(), makeOrder({ total: 945, tax: 45, discount: 100 }));
    expect(shift.totalSales).toBe(945);
    expect(shift.orderCount).toBe(1);
    expect(shift.taxCollected).toBe(45);
    expect(shift.discountTotal).toBe(100);
    expect(shift.cashSales).toBe(945);
    expect(shift.cardSales).toBe(0);
    expect(shift.mobileSales).toBe(0);
  });

  it('keeps separate totals per payment method', () => {
    const orders = [
      makeOrder({ id: 'a', shiftId: 'shift-1', total: 100 }),
      makeOrder({
        id: 'b',
        shiftId: 'shift-1',
        total: 200,
        payment: { method: 'card', amountPaid: 200, change: 0, paidAt: '' },
      }),
      makeOrder({
        id: 'c',
        shiftId: 'shift-1',
        total: 300.5,
        payment: { method: 'mobile', amountPaid: 300.5, change: 0, paidAt: '' },
      }),
      makeOrder({ id: 'd', shiftId: 'other-shift', total: 999 }),
      makeOrder({ id: 'e', shiftId: 'shift-1', total: 50, status: 'cancelled' }),
    ];
    const totals = computeShiftTotals(orders, 'shift-1');
    expect(totals.orderCount).toBe(3);
    expect(totals.totalSales).toBe(600.5);
    expect(totals.cashSales).toBe(100);
    expect(totals.cardSales).toBe(200);
    expect(totals.mobileSales).toBe(300.5);
  });

  it('calculates expected drawer cash, difference and average order', () => {
    const shift = makeShift({ openingCash: 1000, cashSales: 2450, totalSales: 3000, orderCount: 4 });
    expect(calculateExpectedCash(shift)).toBe(3450);
    expect(calculateCashDifference(shift, 3400)).toBe(-50);
    expect(calculateCashDifference(shift, 3500)).toBe(50);
    expect(calculateAverageOrder(shift)).toBe(750);
  });
});

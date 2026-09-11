import type { Order, Shift } from '@/types';
import { fromMinor, sumMoney, toMinor } from './money';

export type ShiftTotals = Pick<
  Shift,
  'totalSales' | 'cashSales' | 'cardSales' | 'mobileSales' | 'taxCollected' | 'discountTotal' | 'orderCount'
>;

export function createEmptyShiftTotals(): ShiftTotals {
  return {
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    mobileSales: 0,
    taxCollected: 0,
    discountTotal: 0,
    orderCount: 0,
  };
}

/**
 * Adds a completed order to shift totals (master spec §98):
 * totalSales += total, orderCount += 1, taxCollected += tax,
 * discountTotal += discount, then the payment-method bucket.
 */
export function applyOrderToShift<T extends ShiftTotals>(shift: T, order: Order): T {
  if (order.status !== 'completed' || !order.payment) return shift;
  const method = order.payment.method;
  return {
    ...shift,
    totalSales: sumMoney([shift.totalSales, order.total]),
    orderCount: shift.orderCount + 1,
    taxCollected: sumMoney([shift.taxCollected, order.tax]),
    discountTotal: sumMoney([shift.discountTotal, order.discount]),
    cashSales: method === 'cash' ? sumMoney([shift.cashSales, order.total]) : shift.cashSales,
    cardSales: method === 'card' ? sumMoney([shift.cardSales, order.total]) : shift.cardSales,
    mobileSales: method === 'mobile' ? sumMoney([shift.mobileSales, order.total]) : shift.mobileSales,
  };
}

/** Recomputes a shift's totals from the orders recorded against it. */
export function computeShiftTotals(orders: readonly Order[], shiftId: string): ShiftTotals {
  return orders
    .filter((order) => order.shiftId === shiftId)
    .reduce<ShiftTotals>((totals, order) => applyOrderToShift(totals, order), createEmptyShiftTotals());
}

export function shiftTotalsEqual(a: ShiftTotals, b: ShiftTotals): boolean {
  return (
    a.orderCount === b.orderCount &&
    toMinor(a.totalSales) === toMinor(b.totalSales) &&
    toMinor(a.cashSales) === toMinor(b.cashSales) &&
    toMinor(a.cardSales) === toMinor(b.cardSales) &&
    toMinor(a.mobileSales) === toMinor(b.mobileSales) &&
    toMinor(a.taxCollected) === toMinor(b.taxCollected) &&
    toMinor(a.discountTotal) === toMinor(b.discountTotal)
  );
}

/** Cash that should be in the drawer: opening float + cash sales. */
export function calculateExpectedCash(shift: Pick<Shift, 'openingCash' | 'cashSales'>): number {
  return sumMoney([shift.openingCash, shift.cashSales]);
}

/** Positive = over, negative = short. */
export function calculateCashDifference(shift: Pick<Shift, 'openingCash' | 'cashSales'>, countedCash: number): number {
  return fromMinor(toMinor(countedCash) - toMinor(calculateExpectedCash(shift)));
}

export function calculateAverageOrder(shift: Pick<Shift, 'totalSales' | 'orderCount'>): number {
  if (shift.orderCount <= 0) return 0;
  return fromMinor(Math.round(toMinor(shift.totalSales) / shift.orderCount));
}

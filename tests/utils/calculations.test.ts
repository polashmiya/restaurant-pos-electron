import { describe, expect, it } from 'vitest';
import {
  calculateChange,
  calculateDiscount,
  calculateLineTotal,
  calculateOrderTax,
  calculateOrderTotals,
  calculatePayment,
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  isCashSufficient,
} from '@/utils/calculations';
import { makeOrderItem } from '../helpers/factories';

describe('order calculations', () => {
  it('calculates the subtotal of all lines', () => {
    const items = [makeOrderItem({ price: 250, quantity: 2 }), makeOrderItem({ id: 'l2', price: 150, quantity: 1 })];
    expect(calculateLineTotal(items[0]!)).toBe(500);
    expect(calculateSubtotal(items)).toBe(650);
  });

  it('applies a fixed discount', () => {
    expect(calculateDiscount(1000, { type: 'fixed', value: 100 })).toBe(100);
  });

  it('applies a percentage discount', () => {
    expect(calculateDiscount(1000, { type: 'percentage', value: 10 })).toBe(100);
    expect(calculateDiscount(333, { type: 'percentage', value: 10 })).toBe(33.3);
  });

  it('never allows a discount greater than the subtotal', () => {
    expect(calculateDiscount(500, { type: 'fixed', value: 800 })).toBe(500);
    expect(calculateDiscount(500, { type: 'percentage', value: 150 })).toBe(500);
    expect(calculateDiscount(500, { type: 'fixed', value: -20 })).toBe(0);
  });

  it('calculates tax on the taxable amount', () => {
    expect(calculateTax(900, 5)).toBe(45);
    expect(calculateTax(900, 0)).toBe(0);
  });

  it('matches the master spec example: ৳1000 − 10% + 5% tax = ৳945', () => {
    const totals = calculateOrderTotals([makeOrderItem({ price: 1000, quantity: 1 })], { type: 'percentage', value: 10 }, 5);
    expect(totals).toEqual({ subtotal: 1000, discount: 100, taxable: 900, tax: 45, total: 945, itemCount: 1 });
    expect(calculateTotal(1000, 100, 45)).toBe(945);
  });

  it('avoids floating point errors', () => {
    const items = [makeOrderItem({ price: 0.1, quantity: 1 }), makeOrderItem({ id: 'l2', price: 0.2, quantity: 1 })];
    expect(calculateSubtotal(items)).toBe(0.3);
    const totals = calculateOrderTotals([makeOrderItem({ price: 19.99, quantity: 3 })], undefined, 7.5);
    expect(totals.subtotal).toBe(59.97);
    expect(totals.tax).toBe(4.5);
    expect(totals.total).toBe(64.47);
  });

  it('shares the order discount across items with different tax rates', () => {
    const items = [
      makeOrderItem({ price: 600, quantity: 1 }),
      makeOrderItem({ id: 'l2', price: 400, quantity: 1, taxRate: 0 }),
    ];
    // 10% discount → taxable 540 at 5% and 360 at 0% → tax 27
    expect(calculateOrderTax(items, 100, 5)).toBe(27);
  });

  it('calculates cash change', () => {
    expect(calculateChange(945, 1000)).toBe(55);
    expect(calculateChange(945, 945)).toBe(0);
  });

  it('detects insufficient cash', () => {
    expect(isCashSufficient(945, 900)).toBe(false);
    expect(isCashSufficient(945, 945)).toBe(true);
    expect(calculateChange(945, 900)).toBe(0);
  });

  it('records card and mobile payments as paid in full with no change', () => {
    expect(calculatePayment('cash', 945, 1000)).toEqual({ amountPaid: 1000, change: 55 });
    expect(calculatePayment('card', 945, 0)).toEqual({ amountPaid: 945, change: 0 });
    expect(calculatePayment('mobile', 945, 5000)).toEqual({ amountPaid: 945, change: 0 });
  });
});

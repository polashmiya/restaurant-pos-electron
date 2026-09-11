import type { DiscountInput, OrderItem, OrderTotals, PaymentMethod } from '@/types';
import { fromMinor, toMinor } from './money';

/**
 * Centralized order math. Formula (master spec §28):
 *
 *   Subtotal − Discount = Taxable amount
 *   Tax   = Taxable amount × Tax rate
 *   Total = Taxable amount + Tax
 *
 * Everything is computed in integer minor units and rounded once, so
 * results are deterministic (e.g. 1000 − 10% + 5% = 945.00).
 */

type PricedItem = Pick<OrderItem, 'price' | 'quantity'> & { taxRate?: number };

function lineMinor(item: Pick<OrderItem, 'price' | 'quantity'>): number {
  const quantity = Number.isFinite(item.quantity) ? Math.max(0, Math.trunc(item.quantity)) : 0;
  return toMinor(item.price) * quantity;
}

export function calculateLineTotal(item: Pick<OrderItem, 'price' | 'quantity'>): number {
  return fromMinor(lineMinor(item));
}

export function calculateSubtotal(items: readonly Pick<OrderItem, 'price' | 'quantity'>[]): number {
  return fromMinor(items.reduce((total, item) => total + lineMinor(item), 0));
}

/** Monetary discount for a fixed or percentage input; never exceeds the subtotal. */
export function calculateDiscount(subtotal: number, discount?: DiscountInput | null): number {
  if (!discount || !Number.isFinite(discount.value) || discount.value <= 0) return 0;
  const subtotalMinor = Math.max(0, toMinor(subtotal));
  const discountMinor =
    discount.type === 'percentage'
      ? Math.round((subtotalMinor * Math.min(discount.value, 100)) / 100)
      : toMinor(discount.value);
  return fromMinor(Math.min(Math.max(discountMinor, 0), subtotalMinor));
}

/** Tax on a taxable amount at a percentage rate. */
export function calculateTax(taxableAmount: number, taxRate: number): number {
  if (!Number.isFinite(taxRate) || taxRate <= 0) return 0;
  return fromMinor(Math.round((Math.max(0, toMinor(taxableAmount)) * taxRate) / 100));
}

/**
 * Tax for a whole order. Items may override the default rate, so the order
 * discount is shared proportionally across lines before applying each rate.
 */
export function calculateOrderTax(items: readonly PricedItem[], discount: number, defaultTaxRate: number): number {
  const subtotalMinor = items.reduce((total, item) => total + lineMinor(item), 0);
  if (subtotalMinor <= 0) return 0;
  const discountMinor = Math.min(Math.max(toMinor(discount), 0), subtotalMinor);

  const uniformRate = getUniformTaxRate(items, defaultTaxRate);
  if (uniformRate !== null) {
    return calculateTax(fromMinor(subtotalMinor - discountMinor), uniformRate);
  }

  let exactTaxMinor = 0;
  for (const item of items) {
    const line = lineMinor(item);
    const taxable = line - (discountMinor * line) / subtotalMinor;
    const rate = item.taxRate ?? defaultTaxRate;
    if (rate > 0) exactTaxMinor += (taxable * rate) / 100;
  }
  return fromMinor(Math.round(exactTaxMinor));
}

/** The single tax rate used by every item, or null when rates differ. */
export function getUniformTaxRate(items: readonly { taxRate?: number }[], defaultTaxRate: number): number | null {
  if (items.length === 0) return defaultTaxRate;
  const first = items[0]?.taxRate ?? defaultTaxRate;
  return items.every((item) => (item.taxRate ?? defaultTaxRate) === first) ? first : null;
}

export function calculateTotal(subtotal: number, discount: number, tax: number): number {
  return fromMinor(toMinor(subtotal) - toMinor(discount) + toMinor(tax));
}

/** Change to return; 0 when the amount received does not cover the total. */
export function calculateChange(total: number, amountReceived: number): number {
  return fromMinor(Math.max(0, toMinor(amountReceived) - toMinor(total)));
}

export function isCashSufficient(total: number, amountReceived: number): boolean {
  return Number.isFinite(amountReceived) && toMinor(amountReceived) >= toMinor(total);
}

export function calculateOrderTotals(
  items: readonly PricedItem[],
  discountInput: DiscountInput | null | undefined,
  defaultTaxRate: number,
): OrderTotals {
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(subtotal, discountInput);
  const taxable = fromMinor(toMinor(subtotal) - toMinor(discount));
  const tax = calculateOrderTax(items, discount, defaultTaxRate);
  const total = calculateTotal(subtotal, discount, tax);
  const itemCount = items.reduce((count, item) => count + Math.max(0, Math.trunc(item.quantity)), 0);
  return { subtotal, discount, taxable, tax, total, itemCount };
}

/**
 * Amount recorded as paid and the change returned.
 * Card and mobile payments are always for the exact total.
 */
export function calculatePayment(
  method: PaymentMethod,
  total: number,
  amountReceived: number,
): { amountPaid: number; change: number } {
  if (method !== 'cash') return { amountPaid: fromMinor(toMinor(total)), change: 0 };
  return { amountPaid: fromMinor(toMinor(amountReceived)), change: calculateChange(total, amountReceived) };
}

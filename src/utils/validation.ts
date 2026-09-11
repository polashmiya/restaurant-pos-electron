import type { TranslationKey } from '@/i18n/keys';
import type { DiscountInput, OrderDraft, OrderTotals, PaymentMethod } from '@/types';
import { calculateSubtotal, isCashSufficient } from './calculations';
import { toMinor } from './money';
import { isValidPhone } from './parse';

/*
 * Order validation rules (master spec §32). Each function returns
 * translation keys so messages are shown in the cashier's language.
 */

export function validateDiscount(subtotal: number, discount: DiscountInput | null | undefined): TranslationKey | null {
  if (!discount) return null;
  if (!Number.isFinite(discount.value) || discount.value < 0) return 'discount.invalid';
  if (discount.type === 'percentage') {
    return discount.value > 100 ? 'discount.percentageRange' : null;
  }
  return toMinor(discount.value) > toMinor(subtotal) ? 'discount.exceedsSubtotal' : null;
}

export function validateCustomer(draft: Pick<OrderDraft, 'orderType' | 'customer'>): TranslationKey | null {
  if (draft.orderType !== 'delivery') return null;
  const customer = draft.customer;
  if (!customer?.name.trim() || !customer.phone.trim() || !customer.address?.trim()) return 'validation.customerRequired';
  if (!isValidPhone(customer.phone)) return 'validation.phoneInvalid';
  return null;
}

export interface OrderValidationContext {
  draft: OrderDraft;
  totals: OrderTotals;
  hasOpenShift: boolean;
}

/** Everything that must be true before the payment dialog may complete an order. */
export function validateOrderForPayment({ draft, totals, hasOpenShift }: OrderValidationContext): TranslationKey[] {
  const issues: TranslationKey[] = [];
  if (draft.items.length === 0) issues.push('validation.cartEmpty');
  else if (toMinor(totals.total) <= 0) issues.push('validation.totalZero');
  if (draft.orderType === 'dine-in' && !draft.tableId) issues.push('validation.tableRequired');
  const discountIssue = validateDiscount(calculateSubtotal(draft.items), draft.discountInput);
  if (discountIssue) issues.push(discountIssue);
  const customerIssue = validateCustomer(draft);
  if (customerIssue) issues.push(customerIssue);
  if (!hasOpenShift) issues.push('validation.shiftRequired');
  return issues;
}

export interface PaymentInput {
  method: PaymentMethod | null;
  total: number;
  amountReceived: number | null;
}

export function validatePayment({ method, total, amountReceived }: PaymentInput): TranslationKey | null {
  if (!method) return 'validation.paymentMethodRequired';
  if (method === 'cash' && (amountReceived === null || !isCashSufficient(total, amountReceived))) {
    return 'validation.insufficientCash';
  }
  return null;
}

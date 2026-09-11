import { APP_CONFIG } from '@/config/app.config';
import type { OrderCounter } from '@/types';
import { formatDateKey } from './format';

export interface GeneratedOrderNumber {
  orderNumber: string;
  counter: OrderCounter;
}

/**
 * Generates ORD-YYYYMMDD-0001 style numbers (master spec §34).
 *
 * The sequence comes from a persisted daily counter (not an array length)
 * and restarts every day. Numbers that already exist — e.g. after restoring
 * a backup or a clock change — are skipped, so a number is never reused.
 */
export function generateOrderNumber(
  counter: OrderCounter,
  existingNumbers: ReadonlySet<string>,
  now: Date = new Date(),
): GeneratedOrderNumber {
  const dateKey = formatDateKey(now);
  const prefix = APP_CONFIG.order.numberPrefix;
  let sequence = counter.date === dateKey ? counter.sequence : 0;
  let orderNumber: string;
  do {
    sequence += 1;
    orderNumber = `${prefix}-${dateKey}-${String(sequence).padStart(APP_CONFIG.order.sequenceDigits, '0')}`;
  } while (existingNumbers.has(orderNumber));
  return { orderNumber, counter: { date: dateKey, sequence } };
}

export function isOrderNumber(value: string): boolean {
  return new RegExp(`^${APP_CONFIG.order.numberPrefix}-\\d{8}-\\d{${APP_CONFIG.order.sequenceDigits},}$`).test(value);
}

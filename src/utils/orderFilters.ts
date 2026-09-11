import type { Order, OrderType, PaymentMethod } from '@/types';
import { sumMoney } from './money';
import { matchesSearch, normalizeSearchText } from './search';

export type DateRangeFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'all';
export type HistoryStatusFilter = 'all' | 'completed' | 'cancelled';

export interface OrderHistoryFilters {
  query: string;
  range: DateRangeFilter;
  status: HistoryStatusFilter;
  orderType: 'all' | OrderType;
  payment: 'all' | PaymentMethod;
}

export const DEFAULT_HISTORY_FILTERS: OrderHistoryFilters = {
  query: '',
  range: 'today',
  status: 'all',
  orderType: 'all',
  payment: 'all',
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local-time [start, end) window for a date range filter. */
export function getDateRange(range: DateRangeFilter, now: Date = new Date()): { start?: Date; end?: Date } {
  const today = startOfDay(now);
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today':
      return { start: today };
    case 'yesterday':
      return { start: new Date(today.getTime() - day), end: today };
    case 'last7':
      return { start: new Date(today.getTime() - 6 * day) };
    case 'last30':
      return { start: new Date(today.getTime() - 29 * day) };
    case 'all':
      return {};
  }
}

/** When the order happened (completion or cancellation, else creation). */
export function getOrderTimestamp(order: Order): string {
  return order.completedAt ?? order.cancelledAt ?? order.createdAt;
}

/** Order number, customer, table, items, cashier and payment reference. */
export function buildOrderSearchText(order: Order): string {
  return normalizeSearchText(
    [
      order.orderNumber,
      order.tableName ?? '',
      order.customer?.name ?? '',
      order.customer?.phone ?? '',
      order.customer?.address ?? '',
      order.cashierName ?? '',
      order.payment?.reference ?? '',
      ...order.items.flatMap((item) => [item.name.bn, item.name.en, item.code ?? '']),
    ].join(' '),
  );
}

export function filterOrderHistory(
  orders: readonly Order[],
  filters: OrderHistoryFilters,
  now: Date = new Date(),
  searchIndex?: ReadonlyMap<string, string>,
): Order[] {
  const { start, end } = getDateRange(filters.range, now);
  const startIso = start?.toISOString();
  const endIso = end?.toISOString();
  const hasQuery = filters.query.trim().length > 0;

  return orders.filter((order) => {
    const stamp = getOrderTimestamp(order);
    if (startIso && stamp < startIso) return false;
    if (endIso && stamp >= endIso) return false;
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.orderType !== 'all' && order.orderType !== filters.orderType) return false;
    if (filters.payment !== 'all' && order.payment?.method !== filters.payment) return false;
    if (!hasQuery) return true;
    const text = searchIndex?.get(order.id) ?? buildOrderSearchText(order);
    return matchesSearch(text, filters.query);
  });
}

/** Count and sales total (completed orders only) of a list. */
export function summarizeOrders(orders: readonly Order[]): { count: number; total: number } {
  return {
    count: orders.length,
    total: sumMoney(orders.filter((order) => order.status === 'completed').map((order) => order.total)),
  };
}

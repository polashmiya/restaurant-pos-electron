import { describe, expect, it } from 'vitest';
import { DEFAULT_HISTORY_FILTERS, filterOrderHistory, getDateRange, summarizeOrders } from '@/utils/orderFilters';
import { makeOrder, makeOrderItem } from '../helpers/factories';

const NOW = new Date(2026, 8, 10, 15, 0);
const at = (day: number, hour = 12) => new Date(2026, 8, day, hour, 0).toISOString();

const orders = [
  makeOrder({ id: 'a', orderNumber: 'ORD-20260910-0001', completedAt: at(10), total: 945, tableName: '05', orderType: 'dine-in' }),
  makeOrder({
    id: 'b',
    orderNumber: 'ORD-20260910-0002',
    completedAt: at(10, 13),
    total: 300,
    orderType: 'delivery',
    customer: { name: 'Karim Ahmed', phone: '01711-000000', address: 'Gulshan 2' },
    payment: { method: 'mobile', amountPaid: 300, change: 0, paidAt: at(10, 13), reference: 'BK12345' },
    items: [makeOrderItem({ name: { bn: 'কাচ্চি বিরিয়ানি', en: 'Kacchi Biryani' } })],
  }),
  makeOrder({ id: 'c', orderNumber: 'ORD-20260909-0007', completedAt: at(9), total: 500 }),
  makeOrder({
    id: 'd',
    orderNumber: 'ORD-20260901-0003',
    status: 'cancelled',
    completedAt: undefined,
    payment: undefined,
    cancelledAt: at(1),
    total: 200,
  }),
];

const filter = (overrides: Partial<typeof DEFAULT_HISTORY_FILTERS>) =>
  filterOrderHistory(orders, { ...DEFAULT_HISTORY_FILTERS, ...overrides }, NOW).map((order) => order.id);

describe('order history filters', () => {
  it('computes local date ranges', () => {
    expect(getDateRange('today', NOW).start).toEqual(new Date(2026, 8, 10));
    expect(getDateRange('yesterday', NOW)).toEqual({ start: new Date(2026, 8, 9), end: new Date(2026, 8, 10) });
    expect(getDateRange('all', NOW)).toEqual({});
  });

  it('filters by date range', () => {
    expect(filter({ range: 'today' })).toEqual(['a', 'b']);
    expect(filter({ range: 'yesterday' })).toEqual(['c']);
    expect(filter({ range: 'last7' })).toEqual(['a', 'b', 'c']);
    expect(filter({ range: 'all' })).toEqual(['a', 'b', 'c', 'd']);
  });

  it('searches order number, customer, phone, table, reference and item names in both languages', () => {
    expect(filter({ range: 'all', query: '0002' })).toEqual(['b']);
    expect(filter({ range: 'all', query: 'karim' })).toEqual(['b']);
    expect(filter({ range: 'all', query: '01711' })).toEqual(['b']);
    expect(filter({ range: 'all', query: 'bk12345' })).toEqual(['b']);
    expect(filter({ range: 'all', query: 'কাচ্চি' })).toEqual(['b']);
    expect(filter({ range: 'all', query: 'kacchi biryani' })).toEqual(['b']);
    expect(filter({ range: 'all', query: '05' })).toContain('a');
  });

  it('filters by status, order type and payment method', () => {
    expect(filter({ range: 'all', status: 'cancelled' })).toEqual(['d']);
    expect(filter({ range: 'all', orderType: 'delivery' })).toEqual(['b']);
    expect(filter({ range: 'all', payment: 'mobile' })).toEqual(['b']);
    expect(filter({ range: 'all', payment: 'cash' })).toEqual(['a', 'c']);
  });

  it('summarizes count and sales (cancelled orders excluded from sales)', () => {
    expect(summarizeOrders(orders)).toEqual({ count: 4, total: 1745 });
  });
});

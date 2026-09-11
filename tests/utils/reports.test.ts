import { describe, expect, it } from 'vitest';
import { APP_CONFIG } from '@/config/app.config';
import type { Category, MenuItem, Order } from '@/types';
import {
  buildSalesReport,
  countRangeDays,
  findPeakHour,
  getGranularity,
  getPreviousRange,
  niceScale,
  parseLocalDay,
  percentChange,
  resolveReportRange,
  UNCATEGORIZED_ID,
} from '@/utils/reports';
import { makeMenuItem, makeOrder, makeOrderItem } from '../helpers/factories';

// Local time: Thursday 10 September 2026, 15:00.
const NOW = new Date(2026, 8, 10, 15, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute).toISOString();
const localDay = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()];

const burger = makeOrderItem({ id: 'l-burger', menuItemId: 'item-001', code: 'BUR-001', price: 250 });
const biryani = makeOrderItem({
  id: 'l-biryani',
  menuItemId: 'item-002',
  code: 'RICE-001',
  name: { bn: 'চিকেন বিরিয়ানি', en: 'Chicken Biryani' },
  price: 500,
});

function completed(overrides: Partial<Order>): Order {
  const completedAt = overrides.completedAt ?? at(10, 12);
  return makeOrder({
    ...overrides,
    completedAt,
    payment: { method: 'cash', amountPaid: 1000, change: 0, paidAt: completedAt, ...overrides.payment },
  });
}

const ORDERS: Order[] = [
  completed({
    id: 'a',
    orderType: 'dine-in',
    items: [{ ...burger, quantity: 2 }, { ...biryani, quantity: 1 }],
    subtotal: 1000,
    discount: 100,
    tax: 45,
    total: 945,
    completedAt: at(10, 13, 10),
    cashierName: 'Rahim',
  }),
  completed({
    id: 'b',
    orderType: 'takeaway',
    items: [{ ...burger, id: 'l-2', quantity: 1 }],
    subtotal: 250,
    discount: 0,
    tax: 12.5,
    total: 262.5,
    completedAt: at(10, 13, 40),
    payment: { method: 'card', amountPaid: 262.5, change: 0, paidAt: at(10, 13, 40) },
    cashierName: 'Rahim',
  }),
  completed({
    id: 'c',
    orderType: 'delivery',
    items: [{ ...biryani, id: 'l-3', quantity: 1 }],
    subtotal: 500,
    discount: 0,
    tax: 25,
    total: 525,
    completedAt: at(9, 20, 5),
    payment: { method: 'mobile', amountPaid: 525, change: 0, paidAt: at(9, 20, 5) },
    cashierName: 'Karim',
  }),
  makeOrder({
    id: 'd',
    status: 'cancelled',
    payment: undefined,
    completedAt: undefined,
    cancelledAt: at(10, 14),
    total: 300,
  }),
  // Outside "last 7 days" (4–10 September).
  completed({ id: 'e', completedAt: at(1, 12), total: 999, subtotal: 999, tax: 0 }),
];

const MENU: MenuItem[] = [
  makeMenuItem({ id: 'item-001', code: 'BUR-001', categoryId: 'cat-burgers', image: 'images/menu/bur-001.webp' }),
  makeMenuItem({ id: 'item-002', code: 'RICE-001', categoryId: 'cat-rice', name: { bn: 'বিরিয়ানি', en: 'Biryani (new name)' } }),
];

const CATEGORIES: Category[] = [
  { id: 'cat-burgers', name: { bn: 'বার্গার', en: 'Burgers' }, icon: 'burger', color: 'pink', sortOrder: 1 },
  { id: 'cat-rice', name: { bn: 'ভাত', en: 'Rice' }, icon: 'rice', color: 'green', sortOrder: 2 },
];

describe('report date ranges', () => {
  it('resolves presets to local [start, end) windows', () => {
    const today = resolveReportRange('today', NOW);
    expect(localDay(today.start)).toEqual([2026, 9, 10, 0]);
    expect(localDay(today.end)).toEqual([2026, 9, 11, 0]);

    const yesterday = resolveReportRange('yesterday', NOW);
    expect(localDay(yesterday.start)).toEqual([2026, 9, 9, 0]);
    expect(localDay(yesterday.end)).toEqual([2026, 9, 10, 0]);

    const last7 = resolveReportRange('last7', NOW);
    expect(localDay(last7.start)).toEqual([2026, 9, 4, 0]);
    expect(countRangeDays(last7)).toBe(7);
    expect(countRangeDays(resolveReportRange('last30', NOW))).toBe(30);

    const thisMonth = resolveReportRange('thisMonth', NOW);
    expect(localDay(thisMonth.start)).toEqual([2026, 9, 1, 0]);
    expect(localDay(thisMonth.end)).toEqual([2026, 9, 11, 0]);

    const lastMonth = resolveReportRange('lastMonth', NOW);
    expect(localDay(lastMonth.start)).toEqual([2026, 8, 1, 0]);
    expect(localDay(lastMonth.end)).toEqual([2026, 9, 1, 0]);
  });

  it('custom ranges include both days, accept reversed input and are capped', () => {
    const range = resolveReportRange('custom', NOW, { from: '2026-09-05', to: '2026-09-01' });
    expect(localDay(range.start)).toEqual([2026, 9, 1, 0]);
    expect(localDay(range.end)).toEqual([2026, 9, 6, 0]);

    const long = resolveReportRange('custom', NOW, { from: '2020-01-01', to: '2026-09-10' });
    expect(countRangeDays(long)).toBe(APP_CONFIG.reports.maxRangeDays);

    const invalid = resolveReportRange('custom', NOW, { from: 'soon', to: '' });
    expect(invalid).toEqual(resolveReportRange('last7', NOW));
  });

  it('parses only real calendar days', () => {
    expect(parseLocalDay('2026-02-30')).toBeNull();
    expect(parseLocalDay('10/09/2026')).toBeNull();
    expect(parseLocalDay('2026-09-10')?.getDate()).toBe(10);
  });

  it('compares with the period of the same length just before', () => {
    const previous = getPreviousRange(resolveReportRange('last7', NOW));
    expect(localDay(previous.start)).toEqual([2026, 8, 28, 0]);
    expect(localDay(previous.end)).toEqual([2026, 9, 4, 0]);
  });

  it('picks hourly, daily or monthly buckets from the range length', () => {
    expect(getGranularity(resolveReportRange('today', NOW))).toBe('hour');
    expect(getGranularity(resolveReportRange('last30', NOW))).toBe('day');
    expect(getGranularity(resolveReportRange('custom', NOW, { from: '2026-01-01', to: '2026-09-10' }))).toBe('month');
  });
});

describe('buildSalesReport', () => {
  const range = resolveReportRange('last7', NOW);
  const report = buildSalesReport(ORDERS, range, { menuItems: MENU, categories: CATEGORIES });

  it('totals completed orders in the range and counts cancellations separately', () => {
    expect(report.totals).toEqual({
      sales: 1732.5,
      grossSales: 1750,
      discount: 100,
      tax: 82.5,
      orders: 3,
      itemsSold: 5,
      averageOrder: 577.5,
      cancelledOrders: 1,
      cancelledValue: 300,
    });
  });

  it('fills every day of the trend, including days without sales', () => {
    expect(report.granularity).toBe('day');
    expect(report.trend).toHaveLength(7);
    const byDay = new Map(report.trend.map((point) => [new Date(point.start).getDate(), point]));
    expect(byDay.get(10)).toMatchObject({ sales: 1207.5, orders: 2 });
    expect(byDay.get(9)).toMatchObject({ sales: 525, orders: 1 });
    expect(byDay.get(5)).toMatchObject({ sales: 0, orders: 0 });
  });

  it('groups by hour of day, payment method, order type and cashier', () => {
    expect(report.byHour).toHaveLength(24);
    expect(report.byHour[13]).toEqual({ hour: 13, sales: 1207.5, orders: 2 });
    expect(report.byHour[20]?.orders).toBe(1);
    expect(findPeakHour(report.byHour)?.hour).toBe(13);

    expect(report.byPayment).toEqual([
      { key: 'cash', sales: 945, orders: 1 },
      { key: 'card', sales: 262.5, orders: 1 },
      { key: 'mobile', sales: 525, orders: 1 },
    ]);
    expect(report.byOrderType.map((row) => [row.key, row.sales])).toEqual([
      ['dine-in', 945],
      ['takeaway', 262.5],
      ['delivery', 525],
    ]);
    expect(report.byCashier).toEqual([
      { name: 'Rahim', sales: 1207.5, orders: 2 },
      { name: 'Karim', sales: 525, orders: 1 },
    ]);
  });

  it('ranks best sellers by quantity using current menu names and photos', () => {
    expect(report.topItems.map((item) => [item.menuItemId, item.quantity, item.sales])).toEqual([
      ['item-001', 3, 750],
      ['item-002', 2, 1000],
    ]);
    expect(report.topItems[0]?.image).toBe('images/menu/bur-001.webp');
    expect(report.topItems[1]?.name.en).toBe('Biryani (new name)');
  });

  it('splits item sales by category (before discount and tax)', () => {
    expect(report.byCategory).toEqual([
      { categoryId: 'cat-rice', name: CATEGORIES[1]!.name, sales: 1000, quantity: 2 },
      { categoryId: 'cat-burgers', name: CATEGORIES[0]!.name, sales: 750, quantity: 3 },
    ]);
    const withoutMenu = buildSalesReport(ORDERS, range);
    expect(withoutMenu.byCategory).toEqual([{ categoryId: UNCATEGORIZED_ID, sales: 1750, quantity: 5 }]);
  });

  it('uses 24 hourly buckets for a single day and flags sample data', () => {
    const today = buildSalesReport(
      ORDERS.map((order) => (order.id === 'b' ? { ...order, sample: true } : order)),
      resolveReportRange('today', NOW),
    );
    expect(today.granularity).toBe('hour');
    expect(today.trend).toHaveLength(24);
    expect(today.trend[13]).toMatchObject({ sales: 1207.5, orders: 2 });
    expect(today.includesSample).toBe(true);
    expect(report.includesSample).toBe(false);
  });

  it('returns an empty but complete report when nothing happened', () => {
    const empty = buildSalesReport([], range);
    expect(empty.totals.orders).toBe(0);
    expect(empty.totals.averageOrder).toBe(0);
    expect(empty.trend.every((point) => point.sales === 0)).toBe(true);
    expect(empty.byPayment.map((row) => row.sales)).toEqual([0, 0, 0]);
    expect(empty.topItems).toEqual([]);
    expect(findPeakHour(empty.byHour)).toBeUndefined();
  });

  it('uses monthly buckets for long ranges', () => {
    const long = buildSalesReport(ORDERS, resolveReportRange('custom', NOW, { from: '2026-01-15', to: '2026-09-10' }));
    expect(long.granularity).toBe('month');
    expect(long.trend).toHaveLength(9);
    expect(new Date(long.trend[0]!.start).getDate()).toBe(15);
    expect(long.trend[8]).toMatchObject({ orders: 4 });
  });
});

describe('report helpers', () => {
  it('percentChange compares with the previous period', () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(1, 3)).toBe(-66.7);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
  });

  it('niceScale produces round axis ticks', () => {
    expect(niceScale(1732.5)).toEqual({ max: 2000, ticks: [0, 500, 1000, 1500, 2000] });
    expect(niceScale(3, { integer: true })).toEqual({ max: 3, ticks: [0, 1, 2, 3] });
    expect(niceScale(0).ticks).toEqual([0]);
    expect(niceScale(0.3).ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });
});

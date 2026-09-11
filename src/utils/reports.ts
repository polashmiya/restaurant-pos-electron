import { APP_CONFIG } from '@/config/app.config';
import type {
  BreakdownRow,
  CashierRow,
  Category,
  CategoryRow,
  CustomRangeInput,
  HourPoint,
  ItemRow,
  MenuItem,
  Order,
  OrderType,
  PaymentMethod,
  ReportGranularity,
  ReportRange,
  ReportRangePreset,
  SalesReport,
  TrendPoint,
} from '@/types';
import { formatDateKey } from './format';
import { fromMinor, toMinor } from './money';
import { getOrderTimestamp } from './orderFilters';

/* ==========================================================================
   Sales reports. Pure functions over completed/cancelled orders, all money
   summed in integer minor units. Days, hours and months are local time.
   ========================================================================== */

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'mobile'];
export const ORDER_TYPES: readonly OrderType[] = ['dine-in', 'takeaway', 'delivery'];
export const UNCATEGORIZED_ID = 'uncategorized';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar arithmetic (safe across daylight-saving changes). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Parses YYYY-MM-DD as a local calendar day; null when invalid. */
export function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Number of calendar days a range covers. */
export function countRangeDays(range: ReportRange): number {
  return Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS));
}

/** Local-time [start, end) window for a preset (or a custom from/to, both inclusive). */
export function resolveReportRange(
  preset: ReportRangePreset,
  now: Date = new Date(),
  custom?: CustomRangeInput,
): ReportRange {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (preset) {
    case 'today':
      return { start: today, end: tomorrow };
    case 'yesterday':
      return { start: addDays(today, -1), end: today };
    case 'last7':
      return { start: addDays(today, -6), end: tomorrow };
    case 'last30':
      return { start: addDays(today, -29), end: tomorrow };
    case 'thisMonth':
      return { start: startOfMonth(today), end: tomorrow };
    case 'lastMonth':
      return { start: addMonths(today, -1), end: startOfMonth(today) };
    case 'custom': {
      const from = custom ? parseLocalDay(custom.from) : null;
      const to = custom ? parseLocalDay(custom.to) : null;
      if (!from || !to) return resolveReportRange('last7', now);
      const [first, last] = from <= to ? [from, to] : [to, from];
      const end = addDays(last, 1);
      const longest = addDays(first, APP_CONFIG.reports.maxRangeDays);
      return { start: first, end: end > longest ? longest : end };
    }
  }
}

/** The window of the same length immediately before (for "vs previous period"). */
export function getPreviousRange(range: ReportRange): ReportRange {
  return { start: addDays(range.start, -countRangeDays(range)), end: range.start };
}

export function getGranularity(range: ReportRange): ReportGranularity {
  const days = countRangeDays(range);
  if (days <= 1) return 'hour';
  if (days <= 92) return 'day';
  return 'month';
}

/** Percentage change; null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Orders whose completion/cancellation falls inside the range. */
export function selectOrdersInRange(orders: readonly Order[], range: ReportRange): Order[] {
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();
  return orders.filter((order) => {
    const stamp = getOrderTimestamp(order);
    return stamp >= startIso && stamp < endIso;
  });
}

interface Bucket {
  start: Date;
  salesMinor: number;
  orders: number;
}

function createTrendBuckets(range: ReportRange, granularity: ReportGranularity): Bucket[] {
  const buckets: Bucket[] = [];
  if (granularity === 'hour') {
    for (let hour = 0; hour < 24; hour += 1) {
      const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate(), hour);
      buckets.push({ start, salesMinor: 0, orders: 0 });
    }
  } else if (granularity === 'day') {
    for (let day = range.start; day < range.end; day = addDays(day, 1)) {
      buckets.push({ start: day, salesMinor: 0, orders: 0 });
    }
  } else {
    for (let month = startOfMonth(range.start); month < range.end; month = addMonths(month, 1)) {
      buckets.push({ start: month < range.start ? range.start : month, salesMinor: 0, orders: 0 });
    }
  }
  return buckets;
}

function bucketKey(date: Date, granularity: ReportGranularity): string {
  if (granularity === 'hour') return String(date.getHours());
  if (granularity === 'day') return formatDateKey(date);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function toRows<K extends string>(keys: readonly K[], totals: Map<K, { salesMinor: number; orders: number }>): BreakdownRow<K>[] {
  return keys.map((key) => {
    const entry = totals.get(key);
    return { key, sales: fromMinor(entry?.salesMinor ?? 0), orders: entry?.orders ?? 0 };
  });
}

function add<K>(map: Map<K, { salesMinor: number; orders: number }>, key: K, salesMinor: number): void {
  const entry = map.get(key) ?? { salesMinor: 0, orders: 0 };
  entry.salesMinor += salesMinor;
  entry.orders += 1;
  map.set(key, entry);
}

export interface SalesReportOptions {
  menuItems?: readonly MenuItem[];
  categories?: readonly Category[];
  topItemsLimit?: number;
}

/**
 * Everything the Reports page, the printed report and the CSV export show,
 * computed from one pass over the orders in the range.
 */
export function buildSalesReport(
  orders: readonly Order[],
  range: ReportRange,
  { menuItems = [], categories = [], topItemsLimit = APP_CONFIG.reports.topItemsLimit }: SalesReportOptions = {},
): SalesReport {
  const granularity = getGranularity(range);
  const inRange = selectOrdersInRange(orders, range);
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const buckets = createTrendBuckets(range, granularity);
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucketKey(bucket.start, granularity), index]));
  const hours: { salesMinor: number; orders: number }[] = Array.from({ length: 24 }, () => ({ salesMinor: 0, orders: 0 }));
  const payments = new Map<PaymentMethod, { salesMinor: number; orders: number }>();
  const types = new Map<OrderType, { salesMinor: number; orders: number }>();
  const cashiers = new Map<string, { salesMinor: number; orders: number }>();
  const categoryTotals = new Map<string, { salesMinor: number; quantity: number }>();
  const itemTotals = new Map<string, { row: Omit<ItemRow, 'sales'>; salesMinor: number; lastSeen: string }>();

  let salesMinor = 0;
  let grossMinor = 0;
  let discountMinor = 0;
  let taxMinor = 0;
  let completedCount = 0;
  let itemsSold = 0;
  let cancelledCount = 0;
  let cancelledMinor = 0;

  for (const order of inRange) {
    if (order.status === 'cancelled') {
      cancelledCount += 1;
      cancelledMinor += toMinor(order.total);
      continue;
    }
    if (order.status !== 'completed') continue;

    const stamp = getOrderTimestamp(order);
    const when = new Date(stamp);
    const totalMinor = toMinor(order.total);
    completedCount += 1;
    salesMinor += totalMinor;
    grossMinor += toMinor(order.subtotal);
    discountMinor += toMinor(order.discount);
    taxMinor += toMinor(order.tax);

    const index = bucketIndex.get(bucketKey(granularity === 'month' ? startOfMonth(when) : when, granularity));
    const bucket = index === undefined ? undefined : buckets[index];
    if (bucket) {
      bucket.salesMinor += totalMinor;
      bucket.orders += 1;
    }
    const hour = hours[when.getHours()];
    if (hour) {
      hour.salesMinor += totalMinor;
      hour.orders += 1;
    }
    if (order.payment) add(payments, order.payment.method, totalMinor);
    add(types, order.orderType, totalMinor);
    add(cashiers, order.cashierName?.trim() || '—', totalMinor);

    for (const line of order.items) {
      const quantity = Math.max(0, Math.trunc(line.quantity));
      const lineMinor = toMinor(line.price) * quantity;
      itemsSold += quantity;

      const menuItem = menuById.get(line.menuItemId);
      const categoryId = menuItem && categoryById.has(menuItem.categoryId) ? menuItem.categoryId : UNCATEGORIZED_ID;
      const categoryEntry = categoryTotals.get(categoryId) ?? { salesMinor: 0, quantity: 0 };
      categoryEntry.salesMinor += lineMinor;
      categoryEntry.quantity += quantity;
      categoryTotals.set(categoryId, categoryEntry);

      const itemKey = line.menuItemId || line.code || line.name.en;
      const existing = itemTotals.get(itemKey);
      if (existing) {
        existing.row.quantity += quantity;
        existing.salesMinor += lineMinor;
        if (!menuItem && stamp > existing.lastSeen) {
          existing.row.name = line.name;
          existing.lastSeen = stamp;
        }
      } else {
        itemTotals.set(itemKey, {
          row: {
            menuItemId: line.menuItemId,
            ...(menuItem?.code || line.code ? { code: menuItem?.code ?? line.code } : {}),
            // Current menu name (reflects renames); the order's snapshot for deleted items.
            name: menuItem?.name ?? line.name,
            ...(menuItem?.image ? { image: menuItem.image } : {}),
            quantity,
          },
          salesMinor: lineMinor,
          lastSeen: stamp,
        });
      }
    }
  }

  const trend: TrendPoint[] = buckets.map((bucket) => ({
    start: bucket.start.toISOString(),
    sales: fromMinor(bucket.salesMinor),
    orders: bucket.orders,
  }));
  const byHour: HourPoint[] = hours.map((entry, hour) => ({ hour, sales: fromMinor(entry.salesMinor), orders: entry.orders }));

  const byCategory: CategoryRow[] = [...categoryTotals]
    .map(([categoryId, entry]) => {
      const name = categoryById.get(categoryId)?.name;
      return { categoryId, ...(name ? { name } : {}), sales: fromMinor(entry.salesMinor), quantity: entry.quantity };
    })
    .sort((a, b) => b.sales - a.sales);

  const topItems: ItemRow[] = [...itemTotals.values()]
    .map(({ row, salesMinor: itemSales }) => ({ ...row, sales: fromMinor(itemSales) }))
    .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales)
    .slice(0, Math.max(0, topItemsLimit));

  const byCashier: CashierRow[] = [...cashiers]
    .map(([name, entry]) => ({ name, sales: fromMinor(entry.salesMinor), orders: entry.orders }))
    .sort((a, b) => b.sales - a.sales);

  return {
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    granularity,
    totals: {
      sales: fromMinor(salesMinor),
      grossSales: fromMinor(grossMinor),
      discount: fromMinor(discountMinor),
      tax: fromMinor(taxMinor),
      orders: completedCount,
      itemsSold,
      averageOrder: completedCount > 0 ? fromMinor(Math.round(salesMinor / completedCount)) : 0,
      cancelledOrders: cancelledCount,
      cancelledValue: fromMinor(cancelledMinor),
    },
    trend,
    byHour,
    byPayment: toRows(PAYMENT_METHODS, payments),
    byOrderType: toRows(ORDER_TYPES, types),
    byCategory,
    topItems,
    byCashier,
    includesSample: inRange.some((order) => order.sample === true),
  };
}

/** Busiest hour of the day (by orders); undefined when there were no orders. */
export function findPeakHour(byHour: readonly HourPoint[]): HourPoint | undefined {
  return byHour.reduce<HourPoint | undefined>(
    (best, entry) => (entry.orders > 0 && (!best || entry.orders > best.orders) ? entry : best),
    undefined,
  );
}

export interface AxisScale {
  max: number;
  ticks: number[];
}

/** Round axis ticks (0 / 2,000 / 4,000 …) covering `max`. */
export function niceScale(max: number, { tickCount = 4, integer = false }: { tickCount?: number; integer?: boolean } = {}): AxisScale {
  if (!Number.isFinite(max) || max <= 0) return { max: integer ? tickCount : 1, ticks: [0] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const nice = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  const step = integer ? Math.max(1, nice * magnitude) : nice * magnitude;
  const niceMax = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= niceMax + step / 2; value += step) ticks.push(Number(value.toPrecision(12)));
  return { max: niceMax, ticks };
}

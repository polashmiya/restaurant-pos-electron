import type { ISODateString, LocalizedText } from './common';
import type { OrderType, PaymentMethod } from './order';

/** Date range choices on the Reports page. */
export type ReportRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

/** Local-time window [start, end). */
export interface ReportRange {
  start: Date;
  end: Date;
}

/** Custom range as entered in the date inputs (YYYY-MM-DD, both inclusive). */
export interface CustomRangeInput {
  from: string;
  to: string;
}

/** Trend buckets: hours for a single day, days up to ~3 months, months beyond. */
export type ReportGranularity = 'hour' | 'day' | 'month';

export interface ReportTotals {
  /** Sum of completed order totals (after discount, including tax). */
  sales: number;
  /** Item sales before discount and tax. */
  grossSales: number;
  discount: number;
  tax: number;
  orders: number;
  itemsSold: number;
  averageOrder: number;
  cancelledOrders: number;
  /** Value of cancelled orders (what they would have been worth). */
  cancelledValue: number;
}

export interface TrendPoint {
  /** Bucket start. */
  start: ISODateString;
  sales: number;
  orders: number;
}

export interface HourPoint {
  hour: number;
  sales: number;
  orders: number;
}

export interface BreakdownRow<K extends string = string> {
  key: K;
  sales: number;
  orders: number;
}

export interface CategoryRow {
  categoryId: string;
  /** Undefined when the category no longer exists. */
  name?: LocalizedText;
  sales: number;
  quantity: number;
}

export interface ItemRow {
  menuItemId: string;
  code?: string;
  /** Name snapshot from the most recent order. */
  name: LocalizedText;
  /** Current menu photo, if the item still exists. */
  image?: string;
  quantity: number;
  sales: number;
}

export interface CashierRow {
  name: string;
  sales: number;
  orders: number;
}

export interface SalesReport {
  range: { start: ISODateString; end: ISODateString };
  granularity: ReportGranularity;
  totals: ReportTotals;
  trend: TrendPoint[];
  byHour: HourPoint[];
  byPayment: BreakdownRow<PaymentMethod>[];
  byOrderType: BreakdownRow<OrderType>[];
  byCategory: CategoryRow[];
  topItems: ItemRow[];
  byCashier: CashierRow[];
  /** True when any order in the range is generated demo data. */
  includesSample: boolean;
}

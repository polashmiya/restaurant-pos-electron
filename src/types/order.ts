import type { ISODateString, Language, LocalizedText } from './common';

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export type PaymentMethod = 'cash' | 'card' | 'mobile';

export type OrderStatus = 'draft' | 'held' | 'completed' | 'cancelled';

export type DiscountType = 'fixed' | 'percentage';

/** Discount as entered by the cashier. The monetary amount is derived. */
export interface DiscountInput {
  type: DiscountType;
  value: number;
}

export interface OrderItem {
  /** Cart line id (unique per line, not per menu item). */
  id: string;
  menuItemId: string;
  code?: string;
  /** Snapshot of the menu item name at the time it was ordered. */
  name: LocalizedText;
  /** Unit price snapshot. */
  price: number;
  quantity: number;
  /** Tax rate override snapshot (percentage). */
  taxRate?: number;
  /** Combined kitchen note printed on the KOT. */
  note?: LocalizedText;
  /** Selected note presets (ids) — used to edit the note later. */
  noteTags?: string[];
  /** Free-text part of the note — used to edit the note later. */
  customNote?: string;
  /** Quantity already sent to the kitchen on a KOT. */
  sentToKitchen?: number;
}

export interface Customer {
  name: string;
  phone: string;
  address?: string;
}

export interface Payment {
  method: PaymentMethod;
  amountPaid: number;
  change: number;
  paidAt: ISODateString;
  /** Card approval code / mobile banking transaction id. */
  reference?: string;
}

export interface Order {
  /** Internal unique id. */
  id: string;
  /** Human readable number: ORD-YYYYMMDD-0001 */
  orderNumber: string;
  orderType: OrderType;
  tableId?: string;
  /** Table name snapshot for history/receipts. */
  tableName?: string;
  /** Number of guests at the table (dine-in); unknown when absent. */
  guests?: number;

  items: OrderItem[];

  discountInput?: DiscountInput;
  /** Tax rate (percentage) used for items without their own rate. */
  taxRate: number;

  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  payment?: Payment;

  status: OrderStatus;

  /** Language the order was completed in — receipts reprint in it. */
  language: Language;

  createdAt: ISODateString;
  updatedAt: ISODateString;
  completedAt?: ISODateString;
  heldAt?: ISODateString;
  cancelledAt?: ISODateString;

  customer?: Customer;

  shiftId?: string;
  cashierName?: string;
  /** Number of kitchen tickets printed for this order. */
  kotCount: number;

  /** Generated demo sale (Settings → About & developer); removable in one step. */
  sample?: boolean;
}

/**
 * The order currently being edited in the POS. Monetary totals are NOT part
 * of the draft — they are always derived from the items/discount/tax rate.
 */
export interface OrderDraft {
  id: string;
  /** Assigned when the draft is first persisted. */
  orderNumber?: string;
  orderType: OrderType;
  tableId?: string;
  /** Number of guests at the table (dine-in). */
  guests?: number;
  items: OrderItem[];
  discountInput?: DiscountInput;
  customer?: Customer;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  kotCount: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
  itemCount: number;
}

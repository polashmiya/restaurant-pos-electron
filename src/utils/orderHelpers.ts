import { APP_CONFIG } from '@/config/app.config';
import { findNotePreset } from '@/data/notePresets';
import type {
  DiningTable,
  Language,
  LocalizedText,
  MenuItem,
  Order,
  OrderDraft,
  OrderItem,
  OrderStatus,
  OrderType,
} from '@/types';
import { calculateOrderTotals } from './calculations';
import { createId } from './id';

export function createEmptyDraft(orderType: OrderType = 'takeaway', now: Date = new Date()): OrderDraft {
  const stamp = now.toISOString();
  return {
    id: createId('order'),
    orderType,
    items: [],
    createdAt: stamp,
    updatedAt: stamp,
    kotCount: 0,
  };
}

export function createOrderItem(menuItem: MenuItem, quantity = 1): OrderItem {
  return {
    id: createId('line'),
    menuItemId: menuItem.id,
    code: menuItem.code,
    name: { ...menuItem.name },
    price: menuItem.price,
    quantity,
    ...(menuItem.taxRate !== undefined ? { taxRate: menuItem.taxRate } : {}),
  };
}

function hasCustomization(item: OrderItem): boolean {
  return Boolean((item.noteTags && item.noteTags.length > 0) || item.customNote?.trim());
}

/**
 * Adds a menu item to a list of cart lines. The same item with the same
 * (empty) customization and price increases quantity; otherwise a new line.
 */
export function addItemToLines(lines: readonly OrderItem[], menuItem: MenuItem): OrderItem[] {
  const index = lines.findIndex(
    (line) => line.menuItemId === menuItem.id && line.price === menuItem.price && !hasCustomization(line),
  );
  if (index === -1) return [...lines, createOrderItem(menuItem)];
  return lines.map((line, lineIndex) =>
    lineIndex === index
      ? { ...line, quantity: Math.min(line.quantity + 1, APP_CONFIG.order.maxItemQuantity) }
      : line,
  );
}

/** Builds the bilingual kitchen note from preset tags and free text. */
export function buildItemNote(noteTags: readonly string[], customNote: string): LocalizedText | undefined {
  const presets = noteTags.map(findNotePreset).filter((preset) => preset !== undefined);
  const custom = customNote.trim();
  if (presets.length === 0 && !custom) return undefined;
  const join = (language: Language) =>
    [...presets.map((preset) => preset.label[language]), ...(custom ? [custom] : [])].join(', ');
  return { bn: join('bn'), en: join('en') };
}

/** Quantity of a line not yet sent to the kitchen. */
export function getUnsentQuantity(item: OrderItem): number {
  return Math.max(0, item.quantity - (item.sentToKitchen ?? 0));
}

/** Lines (with their unsent quantity) that still need a KOT. */
export function getUnsentItems(items: readonly OrderItem[]): OrderItem[] {
  return items
    .map((item) => ({ ...item, quantity: getUnsentQuantity(item) }))
    .filter((item) => item.quantity > 0);
}

export function hasItemsSentToKitchen(items: readonly OrderItem[]): boolean {
  return items.some((item) => (item.sentToKitchen ?? 0) > 0);
}

export interface DraftSnapshotOptions {
  orderNumber: string;
  status: OrderStatus;
  language: Language;
  taxRate: number;
  table?: DiningTable;
  now?: Date;
}

/** Converts the POS draft into a persisted order with a totals snapshot. */
export function draftToOrder(draft: OrderDraft, options: DraftSnapshotOptions): Order {
  const totals = calculateOrderTotals(draft.items, draft.discountInput, options.taxRate);
  const { orderNumber: _draftNumber, ...rest } = draft;
  const order: Order = {
    ...rest,
    orderNumber: options.orderNumber,
    status: options.status,
    language: options.language,
    taxRate: options.taxRate,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    updatedAt: (options.now ?? new Date()).toISOString(),
  };
  if (options.table && draft.orderType === 'dine-in') {
    order.tableId = options.table.id;
    order.tableName = options.table.name;
  } else {
    delete order.tableId;
    delete order.tableName;
  }
  if (draft.orderType !== 'dine-in') delete order.guests;
  if (draft.orderType !== 'delivery') delete order.customer;
  return order;
}

/** Loads a persisted open order back into the POS as an editable draft. */
export function orderToDraft(order: Order): OrderDraft {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    ...(order.tableId ? { tableId: order.tableId } : {}),
    ...(order.guests ? { guests: order.guests } : {}),
    items: order.items.map((item) => ({ ...item })),
    ...(order.discountInput ? { discountInput: { ...order.discountInput } } : {}),
    ...(order.customer ? { customer: { ...order.customer } } : {}),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    kotCount: order.kotCount ?? 0,
  };
}

/** A draft worth saving: it has items or holds a table. */
export function isDraftPersistable(draft: OrderDraft): boolean {
  return draft.items.length > 0 || Boolean(draft.tableId);
}

/** Newest first by completion (or creation) time. */
export function compareOrdersNewestFirst(a: Order, b: Order): number {
  const aTime = a.completedAt ?? a.cancelledAt ?? a.createdAt;
  const bTime = b.completedAt ?? b.cancelledAt ?? b.createdAt;
  return bTime.localeCompare(aTime);
}

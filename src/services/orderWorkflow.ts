import { APP_CONFIG } from '@/config/app.config';
import { useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { selectCurrentShift, useShiftStore } from '@/store/shiftStore';
import { useTableStore } from '@/store/tableStore';
import type {
  AppSettings,
  DiningTable,
  Order,
  OrderCounter,
  OrderDraft,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PosSession,
  Shift,
} from '@/types';
import { calculateOrderTotals, calculatePayment } from '@/utils/calculations';
import { AppError, logError } from '@/utils/errors';
import {
  createEmptyDraft,
  draftToOrder,
  hasItemsSentToKitchen,
  isDraftPersistable,
  orderToDraft,
} from '@/utils/orderHelpers';
import { generateOrderNumber } from '@/utils/orderNumber';
import { applyOrderToShift } from '@/utils/shiftMath';
import { isTakenByAnotherOrder, occupyTable, releaseTable } from '@/utils/tableRules';
import { validateOrderForPayment, validatePayment } from '@/utils/validation';
import { markDraftSynced, syncDraftNow } from './draftSync';
import { runExclusive } from './persistQueue';
import { getStorage } from './storage';

/* ==========================================================================
   Order workflows — every multi-store operation of the POS.

   Rules (master spec §33, §58, §59, §97):
   - Persist first, then update in-memory state. If saving fails, nothing
     changes on screen and the cashier sees a friendly error.
   - Tables, open orders, shifts, counter and session live in the same
     electron-store file, so each workflow's changes are written atomically.
   - A completed order is appended to history BEFORE anything else changes.
   - Nothing is ever silently discarded: leaving an order with items holds it.
   ========================================================================== */

interface OperationChanges {
  openOrders?: Order[];
  tables?: DiningTable[];
  shifts?: Shift[];
  orderCounter?: OrderCounter;
  session?: PosSession;
}

interface WorkflowContext {
  now: Date;
  settings: AppSettings;
  openOrders: Order[];
  tables: DiningTable[];
  orderCounter: OrderCounter;
}

function readContext(): WorkflowContext {
  return {
    now: new Date(),
    settings: useSettingsStore.getState().settings,
    openOrders: useOrderStore.getState().openOrders,
    tables: useTableStore.getState().tables,
    orderCounter: useOrderStore.getState().orderCounter,
  };
}

function commit(changes: OperationChanges, nextDraft?: OrderDraft): void {
  if (changes.openOrders) useOrderStore.getState().setOpenOrders(changes.openOrders);
  if (changes.orderCounter) useOrderStore.getState().setOrderCounter(changes.orderCounter);
  if (changes.tables) useTableStore.getState().setTables(changes.tables);
  if (changes.shifts) useShiftStore.getState().setShifts(changes.shifts);
  if (nextDraft) {
    markDraftSynced(nextDraft);
    usePosStore.getState().replaceDraft(nextDraft);
  }
}

async function persistOperation(changes: OperationChanges, nextDraft?: OrderDraft): Promise<void> {
  try {
    await getStorage().setMany(changes);
  } catch (error) {
    throw new AppError('storage', 'errors.saveFailed', { cause: error });
  }
  commit(changes, nextDraft);
}

async function appendHistory(order: Order): Promise<void> {
  try {
    await getStorage().append('completedOrders', order);
  } catch (error) {
    throw new AppError('storage', 'errors.saveFailed', { cause: error });
  }
  useOrderStore.getState().addCompletedOrder(order);
}

function replaceTable(tables: DiningTable[], updated: DiningTable): DiningTable[] {
  return tables.map((table) => (table.id === updated.id ? updated : table));
}

function upsertOrder(orders: Order[], order: Order): Order[] {
  return orders.some((entry) => entry.id === order.id)
    ? orders.map((entry) => (entry.id === order.id ? order : entry))
    : [...orders, order];
}

function withoutOrder(orders: Order[], orderId: string): Order[] {
  return orders.filter((order) => order.id !== orderId);
}

function releaseTableOf(tables: DiningTable[], draft: OrderDraft, now: Date): DiningTable[] {
  if (!draft.tableId) return tables;
  const table = tables.find((entry) => entry.id === draft.tableId);
  return table && table.activeOrderId === draft.id ? replaceTable(tables, releaseTable(table, now)) : tables;
}

/** Keeps the draft's number or generates the next unique one. */
function numberFor(draft: OrderDraft, context: Pick<WorkflowContext, 'openOrders' | 'orderCounter' | 'now'>) {
  if (draft.orderNumber) return { orderNumber: draft.orderNumber, orderCounter: context.orderCounter };
  const existing = new Set(
    [...context.openOrders, ...useOrderStore.getState().completedOrders].map((order) => order.orderNumber),
  );
  const generated = generateOrderNumber(context.orderCounter, existing, context.now);
  return { orderNumber: generated.orderNumber, orderCounter: generated.counter };
}

function snapshot(
  draft: OrderDraft,
  context: Pick<WorkflowContext, 'settings' | 'tables' | 'now'>,
  status: OrderStatus,
  orderNumber: string,
): Order {
  const table = draft.tableId ? context.tables.find((entry) => entry.id === draft.tableId) : undefined;
  const order = draftToOrder(draft, {
    orderNumber,
    status,
    language: context.settings.language,
    taxRate: context.settings.defaultTaxRate,
    table,
    now: context.now,
  });
  delete order.heldAt;
  return order;
}

interface ParkResult {
  openOrders: Order[];
  tables: DiningTable[];
  orderCounter: OrderCounter;
  heldPrevious: boolean;
}

/**
 * Leaves the current draft without losing anything:
 * - table orders stay open on their table,
 * - other orders with items are put on hold,
 * - empty drafts are discarded and free their table.
 */
function parkCurrentDraft(context: WorkflowContext): ParkResult {
  const draft = usePosStore.getState().draft;
  const { openOrders, tables, orderCounter } = context;

  if (draft.items.length > 0) {
    if (draft.orderType === 'dine-in' && draft.tableId) {
      return { openOrders, tables, orderCounter, heldPrevious: false };
    }
    const numbered = numberFor(draft, context);
    const held: Order = {
      ...snapshot(draft, context, 'held', numbered.orderNumber),
      heldAt: context.now.toISOString(),
    };
    return {
      openOrders: upsertOrder(openOrders, held),
      tables,
      orderCounter: numbered.orderCounter,
      heldPrevious: true,
    };
  }

  return {
    openOrders: withoutOrder(openOrders, draft.id),
    tables: releaseTableOf(tables, draft, context.now),
    orderCounter,
    heldPrevious: false,
  };
}

/* ------------------------------ Public API -------------------------------- */

export interface SwitchResult {
  /** The order that was on screen was put on hold. */
  heldPrevious: boolean;
}

/** Starts a fresh order, optionally seated at an available table. */
export function startNewOrder(options: { orderType?: OrderType; tableId?: string } = {}): Promise<SwitchResult> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const parked = parkCurrentDraft(context);
    let { openOrders, tables, orderCounter } = parked;

    const currentType = usePosStore.getState().draft.orderType;
    let draft = createEmptyDraft(options.tableId ? 'dine-in' : (options.orderType ?? currentType), context.now);
    let session: PosSession = {};

    if (options.tableId) {
      const table = tables.find((entry) => entry.id === options.tableId);
      if (!table) throw new AppError('not-found', 'errors.unexpected', { detail: `Table ${options.tableId} missing` });
      if (isTakenByAnotherOrder(table, draft.id)) throw new AppError('conflict', 'tablePicker.occupiedTitle');
      const numbered = numberFor(draft, { openOrders, orderCounter, now: context.now });
      draft = { ...draft, tableId: table.id, orderNumber: numbered.orderNumber };
      // Seating a reservation: the party size is already known.
      if (table.reservation) draft.guests = Math.min(table.reservation.guests, APP_CONFIG.order.maxGuests);
      orderCounter = numbered.orderCounter;
      tables = replaceTable(tables, occupyTable(table, draft.id, context.now));
      openOrders = upsertOrder(openOrders, snapshot(draft, { ...context, tables }, 'draft', numbered.orderNumber));
      session = { currentOrderId: draft.id };
    }

    await persistOperation({ openOrders, tables, orderCounter, session }, draft);
    return { heldPrevious: parked.heldPrevious };
  });
}

/** Loads an open or held order into the POS (table order, held order). */
export function openOrder(orderId: string): Promise<SwitchResult> {
  return runExclusive(async () => {
    await syncDraftNow();
    if (usePosStore.getState().draft.id === orderId) return { heldPrevious: false };

    const context = readContext();
    const target = context.openOrders.find((order) => order.id === orderId);
    if (!target) throw new AppError('not-found', 'errors.unexpected', { detail: `Order ${orderId} not open` });

    const parked = parkCurrentDraft(context);
    const reopened: Order = { ...target, status: 'draft', updatedAt: context.now.toISOString() };
    delete reopened.heldAt;
    const draft = orderToDraft(reopened);

    await persistOperation(
      {
        openOrders: upsertOrder(parked.openOrders, reopened),
        tables: parked.tables,
        orderCounter: parked.orderCounter,
        session: { currentOrderId: draft.id },
      },
      draft,
    );
    return { heldPrevious: parked.heldPrevious };
  });
}

/** Seats the current order at a table (switching tables if needed). */
export function assignTableToCurrentOrder(tableId: string): Promise<void> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const draft = usePosStore.getState().draft;
    const table = context.tables.find((entry) => entry.id === tableId);
    if (!table) throw new AppError('not-found', 'errors.unexpected', { detail: `Table ${tableId} missing` });
    if (isTakenByAnotherOrder(table, draft.id)) throw new AppError('conflict', 'tablePicker.occupiedTitle');

    let tables = draft.tableId && draft.tableId !== tableId ? releaseTableOf(context.tables, draft, context.now) : context.tables;
    const target = tables.find((entry) => entry.id === tableId) ?? table;
    tables = replaceTable(tables, occupyTable(target, draft.id, context.now));

    const numbered = numberFor(draft, context);
    const next: OrderDraft = {
      ...draft,
      orderType: 'dine-in',
      tableId,
      orderNumber: numbered.orderNumber,
      updatedAt: context.now.toISOString(),
    };
    await persistOperation(
      {
        openOrders: upsertOrder(context.openOrders, snapshot(next, { ...context, tables }, 'draft', numbered.orderNumber)),
        tables,
        orderCounter: numbered.orderCounter,
        session: { currentOrderId: next.id },
      },
      next,
    );
  });
}

/** Dine-in / Takeaway / Delivery. Leaving dine-in frees the table. */
export function changeOrderType(orderType: OrderType): Promise<void> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const draft = usePosStore.getState().draft;
    if (draft.orderType === orderType) return;

    let tables = context.tables;
    const next: OrderDraft = { ...draft, orderType, updatedAt: context.now.toISOString() };
    if (orderType !== 'dine-in' && draft.tableId) {
      tables = releaseTableOf(tables, draft, context.now);
      delete next.tableId;
    }

    let openOrders = withoutOrder(context.openOrders, next.id);
    let orderCounter = context.orderCounter;
    let session: PosSession = {};
    if (isDraftPersistable(next)) {
      const numbered = numberFor(next, context);
      next.orderNumber = numbered.orderNumber;
      orderCounter = numbered.orderCounter;
      openOrders = upsertOrder(context.openOrders, snapshot(next, { ...context, tables }, 'draft', numbered.orderNumber));
      session = { currentOrderId: next.id };
    }
    await persistOperation({ openOrders, tables, orderCounter, session }, next);
  });
}

/** Puts the current order on hold and starts a new one (master spec §60). */
export function holdCurrentOrder(): Promise<Order> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const draft = usePosStore.getState().draft;
    if (draft.items.length === 0) throw new AppError('validation', 'validation.cartEmpty');

    const numbered = numberFor(draft, context);
    const held: Order = {
      ...snapshot({ ...draft, orderNumber: numbered.orderNumber }, context, 'held', numbered.orderNumber),
      heldAt: context.now.toISOString(),
    };
    await persistOperation(
      { openOrders: upsertOrder(context.openOrders, held), orderCounter: numbered.orderCounter, session: {} },
      createEmptyDraft(draft.orderType, context.now),
    );
    return held;
  });
}

/**
 * Clears the current order. If items were already sent to the kitchen the
 * order is recorded as cancelled in history (audit trail).
 */
export function clearCurrentOrder(): Promise<{ cancelled: boolean }> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const draft = usePosStore.getState().draft;

    let cancelled = false;
    if (draft.items.length > 0 && (draft.kotCount > 0 || hasItemsSentToKitchen(draft.items))) {
      const numbered = numberFor(draft, context);
      const record: Order = {
        ...snapshot({ ...draft, orderNumber: numbered.orderNumber }, context, 'cancelled', numbered.orderNumber),
        cancelledAt: context.now.toISOString(),
      };
      await appendHistory(record);
      cancelled = true;
    }

    await persistOperation(
      {
        openOrders: withoutOrder(context.openOrders, draft.id),
        tables: releaseTableOf(context.tables, draft, context.now),
        session: {},
      },
      createEmptyDraft(draft.orderType, context.now),
    );
    return { cancelled };
  });
}

export interface PaymentSubmission {
  method: PaymentMethod;
  /** Cash received (ignored for card/mobile). */
  amountReceived: number | null;
  reference?: string;
}

export interface CompletionResult {
  order: Order;
  /** The order is saved but table/shift updates must be repaired on restart. */
  partialFailure: boolean;
}

/**
 * Completes the current order (master spec §33):
 * validate → calculate → validate payment → order number → persist order →
 * update table → update shift → clear active order.
 *
 * Duplicate protection: while `isProcessingPayment` is true a second call is
 * rejected, and the order id can only be appended to history once.
 */
export async function completeCurrentOrder(submission: PaymentSubmission): Promise<CompletionResult> {
  const pos = usePosStore.getState();
  if (pos.isProcessingPayment) throw new AppError('conflict', 'payment.processing');
  pos.setProcessingPayment(true);

  try {
    return await runExclusive(async () => {
      await syncDraftNow();
      const context = readContext();
      const draft = usePosStore.getState().draft;
      const totals = calculateOrderTotals(draft.items, draft.discountInput, context.settings.defaultTaxRate);
      const shift = selectCurrentShift(useShiftStore.getState());

      const [issue] = validateOrderForPayment({ draft, totals, hasOpenShift: Boolean(shift) });
      if (issue) throw new AppError('validation', issue);
      const paymentIssue = validatePayment({
        method: submission.method,
        total: totals.total,
        amountReceived: submission.amountReceived,
      });
      if (paymentIssue || !shift) throw new AppError('validation', paymentIssue ?? 'validation.shiftRequired');

      const { amountPaid, change } = calculatePayment(submission.method, totals.total, submission.amountReceived ?? 0);
      const numbered = numberFor(draft, context);
      const paidAt = context.now.toISOString();
      const reference = submission.reference?.trim();
      const completed: Order = {
        ...snapshot({ ...draft, orderNumber: numbered.orderNumber }, context, 'completed', numbered.orderNumber),
        payment: { method: submission.method, amountPaid, change, paidAt, ...(reference ? { reference } : {}) },
        completedAt: paidAt,
        shiftId: shift.id,
        cashierName: shift.cashierName,
      };

      // 1. Durability point: if this fails nothing else changes and the cart stays.
      await appendHistory(completed);

      // 2. Table → available, shift totals, open orders, session (one atomic write).
      const changes: OperationChanges = {
        tables: releaseTableOf(context.tables, draft, context.now),
        shifts: useShiftStore
          .getState()
          .shifts.map((entry) => (entry.id === shift.id ? applyOrderToShift(entry, completed) : entry)),
        openOrders: withoutOrder(context.openOrders, draft.id),
        orderCounter: numbered.orderCounter,
        session: {},
      };
      let partialFailure = false;
      try {
        await getStorage().setMany(changes);
      } catch (error) {
        // The order itself is safe; startup reconciliation repairs the rest.
        logError('complete-order', error);
        partialFailure = true;
      }

      // 3. Clear the active order.
      commit(changes, createEmptyDraft(draft.orderType, context.now));
      return { order: completed, partialFailure };
    });
  } finally {
    usePosStore.getState().setProcessingPayment(false);
  }
}

/**
 * Records a printed KOT: adds the printed quantities to each line's
 * `sentToKitchen` (items added while printing stay unsent).
 */
export function markCurrentOrderSentToKitchen(printed: readonly OrderItem[]): Promise<void> {
  return runExclusive(async () => {
    const draft = usePosStore.getState().draft;
    const printedById = new Map(printed.map((item) => [item.id, item.quantity]));
    usePosStore.getState().replaceDraft({
      ...draft,
      items: draft.items.map((item) => {
        const sent = printedById.get(item.id);
        return sent === undefined
          ? item
          : { ...item, sentToKitchen: Math.min(item.quantity, (item.sentToKitchen ?? 0) + sent) };
      }),
      kotCount: draft.kotCount + 1,
      updatedAt: new Date().toISOString(),
    });
    await syncDraftNow();
  });
}

/**
 * Saves pending edits and returns the current order as a printable snapshot
 * (KOT before payment, pre-payment bill).
 */
export function snapshotCurrentOrder(): Promise<Order> {
  return runExclusive(async () => {
    await syncDraftNow();
    const context = readContext();
    const draft = usePosStore.getState().draft;
    if (draft.items.length === 0 || !draft.orderNumber) throw new AppError('validation', 'validation.cartEmpty');
    return snapshot(draft, context, 'draft', draft.orderNumber);
  });
}

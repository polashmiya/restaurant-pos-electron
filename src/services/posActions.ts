import { message, type TranslationKey } from '@/i18n/keys';
import { usePosStore, getCurrentTotals } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { selectCurrentShift, useShiftStore } from '@/store/shiftStore';
import { useTableStore } from '@/store/tableStore';
import { confirmAction, toast, useUIStore } from '@/store/uiStore';
import type { MenuItem, OrderType } from '@/types';
import { localize } from '@/utils/localize';
import { hasItemsSentToKitchen } from '@/utils/orderHelpers';
import { validateCustomer } from '@/utils/validation';
import {
  assignTableToCurrentOrder,
  changeOrderType,
  clearCurrentOrder,
  completeCurrentOrder,
  holdCurrentOrder,
  openOrder,
  startNewOrder,
  type PaymentSubmission,
  type SwitchResult,
} from './orderWorkflow';
import { attempt, runAction } from './actionRunner';
import { autoPrintAfterPayment } from './printActions';
import { playSound } from './sound';

/* ==========================================================================
   Cashier-facing actions: confirmations, toasts and sounds around the
   order workflows. Used by POS components and keyboard shortcuts alike.
   ========================================================================== */

function announceSwitch(result: SwitchResult | undefined): void {
  if (result?.heldPrevious) toast.info(message('toast.previousOrderHeld'));
}

function tableName(tableId: string | undefined): string {
  return useTableStore.getState().tables.find((table) => table.id === tableId)?.name ?? '';
}

export function addMenuItemToOrder(item: MenuItem): void {
  const result = usePosStore.getState().addItem(item);
  if (result === 'added') {
    playSound('add');
    return;
  }
  playSound('error');
  if (result === 'unavailable') {
    const language = useSettingsStore.getState().settings.language;
    toast.warning(message('validation.itemUnavailable', { name: localize(item.name, language) }));
  } else {
    toast.warning(message('validation.maxQuantity'));
  }
}

export async function requestOrderTypeChange(orderType: OrderType): Promise<void> {
  const { draft } = usePosStore.getState();
  if (draft.orderType === orderType) return;
  if (draft.orderType === 'dine-in' && draft.tableId) {
    const confirmed = await confirmAction({
      title: message('confirm.changeTypeTitle'),
      message: message('confirm.changeTypeMessage', { name: tableName(draft.tableId) }),
      confirmLabel: message('common.change'),
    });
    if (!confirmed) return;
  }
  await attempt('change-order-type', () => changeOrderType(orderType));
}

/**
 * Selects a table for the current order. Returns true when the table
 * picker can close. Occupied tables open their existing order instead
 * (never two active orders on one table); reserved tables ask first.
 */
export async function selectTableForCurrentOrder(tableId: string): Promise<boolean> {
  const table = useTableStore.getState().tables.find((entry) => entry.id === tableId);
  if (!table) return false;
  const { draft } = usePosStore.getState();
  if (table.activeOrderId === draft.id) return true;

  if (table.activeOrderId) {
    const confirmed = await confirmAction({
      title: message('tablePicker.occupiedTitle'),
      message: message('tablePicker.occupiedMessage', { name: table.name }),
      confirmLabel: message('tablePicker.openExisting'),
    });
    if (!confirmed) return false;
    const result = await runAction('open-table-order', () => openOrder(table.activeOrderId as string));
    announceSwitch(result);
    return result !== undefined;
  }

  if (table.status === 'reserved' && table.reservation) {
    const confirmed = await confirmAction({
      title: message('tablePicker.reservedTitle'),
      message: message('tablePicker.reservedMessage', {
        name: table.name,
        guest: table.reservation.guestName,
        time: table.reservation.time,
      }),
      confirmLabel: message('tablePicker.seatAnyway'),
    });
    if (!confirmed) return false;
  }

  if (!(await attempt('assign-table', () => assignTableToCurrentOrder(tableId)))) return false;
  toast.success(message('toast.tableSelected', { name: table.name }));
  return true;
}

/**
 * Asks how many guests sit at the table — when Settings → Appearance asks
 * for it and the current dine-in order does not know yet.
 */
export function promptGuestCount(): void {
  const { draft } = usePosStore.getState();
  if (!useSettingsStore.getState().settings.ui.askGuestCount) return;
  if (draft.orderType !== 'dine-in' || !draft.tableId || draft.guests) return;
  useUIStore.getState().openModal({ type: 'guestCount' });
}

export async function requestNewOrder(): Promise<void> {
  announceSwitch(await runAction('new-order', () => startNewOrder()));
}

export async function resumeOrder(orderId: string): Promise<boolean> {
  const result = await runAction('resume-order', () => openOrder(orderId));
  if (!result) return false;
  toast.success(message('toast.orderResumed'));
  announceSwitch(result);
  return true;
}

export async function requestHoldOrder(): Promise<void> {
  const held = await runAction('hold-order', () => holdCurrentOrder());
  if (held) toast.success(message('toast.orderHeld'));
}

export async function requestClearOrder(): Promise<void> {
  const { draft } = usePosStore.getState();
  if (draft.items.length === 0 && !draft.tableId) return;
  const sentToKitchen = draft.kotCount > 0 || hasItemsSentToKitchen(draft.items);
  const confirmed = await confirmAction({
    title: message('confirm.clearOrderTitle'),
    message: message(sentToKitchen ? 'confirm.clearOrderSentMessage' : 'confirm.clearOrderMessage'),
    confirmLabel: message('cart.clearOrder'),
    tone: 'danger',
  });
  if (!confirmed) return;
  const result = await runAction('clear-order', () => clearCurrentOrder());
  if (result) toast.success(message(result.cancelled ? 'toast.orderCancelled' : 'toast.orderCleared'));
}

/**
 * Completes the payment. On success the receipt preview replaces the
 * payment dialog; on failure the cart stays untouched and a friendly error
 * is shown (master spec §33, §58).
 */
export async function submitPayment(submission: PaymentSubmission): Promise<boolean> {
  const result = await runAction('complete-payment', () => completeCurrentOrder(submission));
  if (!result) return false;
  playSound('success');
  toast.success(message('toast.paymentCompleted'));
  if (result.partialFailure) toast.warning(message('errors.orderSavedWithWarning'));
  useUIStore.getState().replaceModal({
    type: 'printPreview',
    orderId: result.order.id,
    document: 'receipt',
    justCompleted: true,
  });
  // Printing happens after the order is safely saved; a printer problem
  // never affects the completed order (it can be reprinted from Orders).
  void autoPrintAfterPayment(result.order);
  return true;
}

/** Pre-payment checks that do not need the payment dialog. */
function getBlockingIssue(): TranslationKey | null {
  const { draft } = usePosStore.getState();
  const totals = getCurrentTotals();
  if (draft.items.length === 0) return 'validation.cartEmpty';
  if (totals.total <= 0) return 'validation.totalZero';
  if (draft.orderType === 'dine-in' && !draft.tableId) return 'validation.tableRequired';
  return validateCustomer(draft);
}

/**
 * "Pay & Print Bill" / F9: validates the order and opens the payment
 * dialog. Offers to open a shift first when none is open.
 */
export async function requestPayment(): Promise<void> {
  const ui = useUIStore.getState();
  if (usePosStore.getState().isProcessingPayment) return;
  const issue = getBlockingIssue();
  if (issue) {
    playSound('error');
    toast.warning(message(issue));
    if (issue === 'validation.tableRequired') ui.openModal({ type: 'tablePicker' });
    return;
  }
  if (!selectCurrentShift(useShiftStore.getState())) {
    const confirmed = await confirmAction({
      title: message('payment.noShiftTitle'),
      message: message('payment.noShiftMessage'),
      confirmLabel: message('shift.open'),
    });
    if (confirmed) ui.openModal({ type: 'openShift', thenOpenPayment: true });
    return;
  }
  ui.openModal({ type: 'payment' });
}

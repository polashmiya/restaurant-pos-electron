import { message } from '@/i18n/keys';
import { useTableStore } from '@/store/tableStore';
import { confirmAction, toast, useUIStore } from '@/store/uiStore';
import type { DiningTable, Reservation } from '@/types';
import { getTableAction } from '@/utils/tableRules';
import { openOrder, startNewOrder } from './orderWorkflow';
import { attempt, runAction } from './actionRunner';
import { promptGuestCount, requestPayment } from './posActions';

/* ==========================================================================
   Table floor actions (master spec §59):
   Available → start new order · Occupied → open existing order ·
   Reserved → view reservation · Waiting for bill → open bill.
   ========================================================================== */

function findTable(tableId: string): DiningTable | undefined {
  return useTableStore.getState().tables.find((table) => table.id === tableId);
}

/** Starts a new order seated at an available (or reserved) table. */
export async function startOrderAtTable(tableId: string): Promise<boolean> {
  const result = await runAction('start-table-order', () => startNewOrder({ tableId }));
  if (!result) return false;
  const ui = useUIStore.getState();
  ui.closeAllModals();
  ui.navigate('pos');
  if (result.heldPrevious) toast.info(message('toast.previousOrderHeld'));
  promptGuestCount();
  return true;
}

/** Opens the table's existing order in the POS (optionally straight to payment). */
export async function openTableOrder(tableId: string, options: { openPayment?: boolean } = {}): Promise<boolean> {
  const orderId = findTable(tableId)?.activeOrderId;
  if (!orderId) return false;
  const result = await runAction('open-table-order', () => openOrder(orderId));
  if (!result) return false;
  const ui = useUIStore.getState();
  ui.closeAllModals();
  ui.navigate('pos');
  if (result.heldPrevious) toast.info(message('toast.previousOrderHeld'));
  if (options.openPayment) await requestPayment();
  return true;
}

/** Primary tap action on the table floor. */
export async function handleTableTap(table: DiningTable): Promise<void> {
  switch (getTableAction(table)) {
    case 'start-order':
      await startOrderAtTable(table.id);
      break;
    case 'open-order':
      await openTableOrder(table.id);
      break;
    case 'open-bill':
      await openTableOrder(table.id, { openPayment: true });
      break;
    case 'view-reservation':
      useUIStore.getState().openModal({ type: 'tableActions', tableId: table.id });
      break;
  }
}

export async function reserveTable(tableId: string, reservation: Reservation): Promise<boolean> {
  const done = await attempt('reserve-table', () => useTableStore.getState().reserve(tableId, reservation));
  if (done) toast.success(message('tables.reserved'));
  return done;
}

export async function cancelReservation(tableId: string): Promise<boolean> {
  const table = findTable(tableId);
  if (!table?.reservation) return false;
  const confirmed = await confirmAction({
    title: message('tables.cancelReservation'),
    message: message('tables.reservedFor', { name: table.reservation.guestName, time: table.reservation.time }),
    confirmLabel: message('tables.cancelReservation'),
    tone: 'danger',
  });
  if (!confirmed) return false;
  const done = await attempt('cancel-reservation', () => useTableStore.getState().cancelReservation(tableId));
  if (done) toast.success(message('tables.reservationCancelled'));
  return done;
}

/** Occupied ↔ Waiting for bill. */
export async function setTableWaiting(tableId: string, waiting: boolean): Promise<boolean> {
  const done = await attempt('table-waiting', () => useTableStore.getState().setWaitingForBill(tableId, waiting));
  if (done && waiting) toast.success(message('tables.billRequested'));
  return done;
}

import { APP_CONFIG } from '@/config/app.config';
import { message, type TranslationKey } from '@/i18n/keys';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTableStore } from '@/store/tableStore';
import { toast, useUIStore } from '@/store/uiStore';
import type { Order, PrintDocument, PrintKind } from '@/types';
import { logError } from '@/utils/errors';
import { createId } from '@/utils/id';
import { getUnsentItems } from '@/utils/orderHelpers';
import type { PrintFailure, PrintResult } from '../../electron/types/electron';
import { attempt, runAction } from './actionRunner';
import { markCurrentOrderSentToKitchen, snapshotCurrentOrder } from './orderWorkflow';
import {
  dispatchPrint,
  kotDocument,
  receiptDocument,
  saveDocumentAsPdf,
  type KotPrintOptions,
  type PrintTarget,
  type ReceiptPrintOptions,
} from './printService';

/* ==========================================================================
   Cashier-facing print actions. Printing always happens AFTER data is saved
   and never changes an order: a failed print only shows a message and the
   document can be reprinted from Orders (master spec §58, §94).
   ========================================================================== */

const FAILURE_MESSAGES: Record<PrintFailure, TranslationKey> = {
  'no-printer': 'print.noPrinter',
  'printer-not-found': 'print.printerNotFound',
  timeout: 'print.timedOut',
  error: 'print.failed',
};

/** Shows the outcome of a print job; true when the document was printed. */
function reportPrint(result: PrintResult, successKey: TranslationKey): boolean {
  switch (result.outcome) {
    case 'printed':
    case 'saved-pdf':
      toast.success(message(successKey));
      return true;
    case 'cancelled':
      toast.info(message('print.cancelled'));
      return false;
    case 'failed':
      logError('print', result.reason);
      toast.error(message(FAILURE_MESSAGES[result.failure ?? 'error']));
      return false;
  }
}

/** Prints a document right away on the given printer (default: Settings → Printer). */
export async function printDocumentNow(document: PrintDocument, successKey: TranslationKey, target?: PrintTarget): Promise<boolean> {
  return reportPrint(await dispatchPrint(document, target), successKey);
}

/** "Save as PDF"; true when the file was written. Cancelling the save dialog is silent. */
export async function saveDocumentPdf(document: PrintDocument, target?: PrintTarget): Promise<boolean> {
  const result = await saveDocumentAsPdf(document, target);
  if (result.ok) {
    if (result.filePath) toast.success(message('print.pdfSaved', { path: result.filePath }), APP_CONFIG.ui.longToastDurationMs);
    return true;
  }
  if (result.reason === 'failed') toast.error(message('print.pdfFailed'));
  return false;
}

const pendingDialogs = new Map<string, (printed: boolean) => void>();

/** Settles an open print dialog request (the first call wins). */
export function settlePrintDialog(requestId: string, printed: boolean): void {
  const settle = pendingDialogs.get(requestId);
  pendingDialogs.delete(requestId);
  settle?.(printed);
}

/**
 * Opens the print dialog (preview, printer, copies, Save as PDF) and resolves
 * true once the document was printed or saved, false when the dialog closed
 * without that — however it was closed.
 */
export function openPrintDialog(document: PrintDocument, successKey: TranslationKey): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = createId('print');
    const unsubscribe = useUIStore.subscribe((state) => {
      if (!state.modalStack.some((modal) => modal.type === 'print' && modal.requestId === requestId)) {
        settlePrintDialog(requestId, false);
      }
    });
    pendingDialogs.set(requestId, (printed) => {
      unsubscribe();
      resolve(printed);
    });
    useUIStore.getState().openModal({ type: 'print', requestId, document, successKey });
  });
}

/**
 * Prints the way Settings → Printer asks: straight to the printer ("print
 * without dialog"), or through the print dialog. When a direct print fails,
 * the dialog opens so the cashier can pick another printer or save a PDF.
 */
async function printPerSettings(document: PrintDocument, successKey: TranslationKey): Promise<boolean> {
  if (!useSettingsStore.getState().settings.printer.silentPrint) return openPrintDialog(document, successKey);
  const result = await dispatchPrint(document);
  if (reportPrint(result, successKey)) return true;
  return result.outcome === 'failed' ? openPrintDialog(document, successKey) : false;
}

export function printOrderReceipt(order: Order, options: ReceiptPrintOptions = {}): Promise<boolean> {
  return printDocumentNow(
    receiptDocument(order, options),
    options.variant === 'bill' ? 'print.billPrinted' : 'print.receiptPrinted',
  );
}

export function printOrderKot(order: Order, options: KotPrintOptions = {}): Promise<boolean> {
  return printDocumentNow(kotDocument(order, options), 'print.kotPrinted');
}

/** Settings → Printer → Test: a check page for the receipt or KOT printer. */
export function printTestDocument(kind: PrintKind): Promise<boolean> {
  const { language } = useSettingsStore.getState().settings;
  return printPerSettings({ type: 'test', kind, language }, 'print.testPrinted');
}

/** After a payment: prints what Settings → Printer asks for, straight to the configured printers. */
export async function autoPrintAfterPayment(order: Order): Promise<void> {
  const { printer, language } = useSettingsStore.getState().settings;
  if (printer.autoPrintReceipt) await printOrderReceipt(order);
  if (printer.autoPrintKot) {
    const items = getUnsentItems(order.items);
    if (items.length > 0) {
      await printOrderKot(order, {
        items,
        language,
        ticketNumber: order.kotCount + 1,
        additional: order.kotCount > 0,
      });
    }
  }
}

/** POS "KOT" button: sends only the items not yet sent to the kitchen. */
export async function sendCurrentOrderToKitchen(): Promise<void> {
  if (usePosStore.getState().draft.items.length === 0) {
    toast.warning(message('validation.cartEmpty'));
    return;
  }
  const order = await runAction('kot-snapshot', snapshotCurrentOrder);
  if (!order) return;

  const items = getUnsentItems(order.items);
  if (items.length === 0) {
    toast.info(message('print.noNewKotItems'));
    return;
  }
  const document = kotDocument(order, {
    items,
    language: useSettingsStore.getState().settings.language,
    ticketNumber: order.kotCount + 1,
    additional: order.kotCount > 0,
  });
  const printed = await printPerSettings(document, 'print.kotPrinted');
  if (printed) await attempt('kot-mark-sent', () => markCurrentOrderSentToKitchen(items));
}

/** POS "Bill" button: prints the pre-payment bill; the table waits for payment. */
export async function printBillForCurrentOrder(): Promise<void> {
  if (usePosStore.getState().draft.items.length === 0) {
    toast.warning(message('validation.cartEmpty'));
    return;
  }
  const order = await runAction('bill-snapshot', snapshotCurrentOrder);
  if (!order) return;

  const document = receiptDocument(order, { variant: 'bill', language: useSettingsStore.getState().settings.language });
  const printed = await printPerSettings(document, 'print.billPrinted');
  const table = useTableStore.getState().tables.find((entry) => entry.id === order.tableId);
  if (printed && table?.status === 'occupied') {
    await attempt('bill-table-waiting', () => useTableStore.getState().setWaitingForBill(table.id, true));
  }
}

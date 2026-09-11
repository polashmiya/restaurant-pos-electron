import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStoreData } from '@/services/bootstrap';
import { completeCurrentOrder } from '@/services/orderWorkflow';
import { whenIdle } from '@/services/persistQueue';
import {
  autoPrintAfterPayment,
  printDocumentNow,
  printOrderReceipt,
  saveDocumentPdf,
  sendCurrentOrderToKitchen,
  settlePrintDialog,
} from '@/services/printActions';
import {
  defaultPrintTarget,
  kotDocument,
  receiptDocument,
  renderDocumentHtml,
  renderKotDocument,
  renderReceiptDocument,
} from '@/services/printService';
import { setStorageAdapter } from '@/services/storage';
import { useMenuStore } from '@/store/menuStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShiftStore } from '@/store/shiftStore';
import { useUIStore, type AppModal } from '@/store/uiStore';
import type { Order } from '@/types';
import { createEmptyDraft } from '@/utils/orderHelpers';
import type { ElectronAPI, ExportResult, PrintJobOptions, PrintResult, SavePdfOptions } from '../../electron/types/electron';
import { makeOrder, makeOrderItem } from '../helpers/factories';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

const bnOrder = makeOrder({
  orderType: 'dine-in',
  tableName: '05',
  items: [
    makeOrderItem({ id: 'l1', price: 250, quantity: 2, note: { bn: 'পেঁয়াজ ছাড়া', en: 'No onions' } }),
    makeOrderItem({ id: 'l2', menuItemId: 'fries', name: { bn: 'ফ্রেঞ্চ ফ্রাই', en: 'French Fries' }, price: 150, quantity: 1 }),
  ],
  discountInput: { type: 'percentage', value: 10 },
  subtotal: 650,
  discount: 65,
  tax: 29.25,
  total: 614.25,
  language: 'bn',
  cashierName: 'রহিম',
  payment: { method: 'cash', amountPaid: 1000, change: 385.75, paidAt: '2026-09-10T08:05:00.000Z' },
});

function installPrintApi(result: PrintResult | Error, pdfResult: ExportResult = { ok: false, reason: 'cancelled' }) {
  const call = vi.fn(async (_html: string, _options: PrintJobOptions): Promise<PrintResult> => {
    if (result instanceof Error) throw result;
    return result;
  });
  const savePdf = vi.fn(async (_html: string, _options: SavePdfOptions): Promise<ExportResult> => pdfResult);
  const api = {
    print: { receipt: call, kot: call, savePdf, getPrinters: vi.fn(async () => []) },
    app: { setNativeTheme: vi.fn(async () => undefined) },
  } as unknown as ElectronAPI;
  Object.defineProperty(window, 'electronAPI', { value: api, configurable: true, writable: true });
  return Object.assign(call, { savePdf });
}

/** The print dialog an action opened and is waiting for. */
function waitForPrintDialog(): Promise<Extract<AppModal, { type: 'print' }>> {
  return vi.waitFor(() => {
    const top = useUIStore.getState().modalStack.at(-1);
    if (top?.type !== 'print') throw new Error('print dialog not open yet');
    return top;
  });
}

describe('receipt and KOT documents', () => {
  it('renders a Bangla receipt for a Bangla order (80 mm, embedded font, no remote resources)', async () => {
    const html = await renderReceiptDocument(bnOrder);
    expect(html).toContain('<html lang="bn"');
    expect(html).toContain('@page{size:80mm auto;margin:0}');
    expect(html).toContain("font-family:'POS Print'");
    expect(html).not.toMatch(/https?:\/\//);
    for (const label of ['রসিদ', 'অর্ডার', 'টেবিল', 'পরিমাণ', 'উপমোট', 'ছাড়', 'ট্যাক্স', 'সর্বমোট', 'পরিশোধ', 'ফেরত', 'ধন্যবাদ']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('আরবান স্পুন রেস্টুরেন্ট');
    expect(html).toContain('ORD-20260910-0001');
    expect(html).toContain('চিকেন বার্গার');
    expect(html).toContain('৳ 614.25');
    expect(html).toContain('৳ 385.75');
    expect(html).toContain('রহিম');
  });

  it('renders the same order in English when reprinted in English', async () => {
    const html = await renderReceiptDocument(bnOrder, { language: 'en', reprint: true });
    expect(html).toContain('<html lang="en"');
    for (const label of ['RECEIPT', 'ORDER', 'TABLE', 'QTY', 'SUBTOTAL', 'DISCOUNT (10%)', 'TAX (5%)', 'TOTAL', 'PAID', 'CHANGE', 'THANK YOU', 'REPRINT']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('Urban Spoon Restaurant');
    expect(html).toContain('Chicken Burger');
  });

  it('a pre-payment bill says payment is pending', async () => {
    const html = await renderReceiptDocument({ ...bnOrder, payment: undefined, status: 'draft' }, { variant: 'bill', language: 'en' });
    expect(html).toContain('BILL');
    expect(html).toContain('PAYMENT PENDING');
    expect(html).not.toContain('CHANGE');
  });

  it('renders a KOT with notes and without prices by default', async () => {
    const html = await renderKotDocument(bnOrder, { language: 'bn', ticketNumber: 2, additional: true });
    expect(html).toContain('কিচেন অর্ডার');
    expect(html).toContain('কিচেন টিকিট #2');
    expect(html).toContain('অতিরিক্ত আইটেম');
    expect(html).toContain('পেঁয়াজ ছাড়া');
    expect(html).not.toContain('৳');

    const english = await renderKotDocument(bnOrder, { language: 'en' });
    expect(english).toContain('KITCHEN ORDER TICKET');
    expect(english).toContain('No onions');
  });

  it('follows the 58 mm paper setting', async () => {
    const settings = useSettingsStore.getState().settings;
    useSettingsStore.setState({ settings: { ...settings, printer: { ...settings.printer, paperWidth: '58mm' } } });
    try {
      const html = await renderReceiptDocument(bnOrder);
      expect(html).toContain('@page{size:58mm auto;margin:0}');
      expect(html).toContain('pos-doc--58');
    } finally {
      useSettingsStore.setState({ settings });
    }
  });

  it('prints the number of guests on the KOT and the receipt', async () => {
    const withGuests = { ...bnOrder, guests: 4 };
    const kot = await renderKotDocument(withGuests, { language: 'bn' });
    expect(kot).toMatch(/<th>অতিথি<\/th><td class="strong">4<\/td>/);
    const receipt = await renderReceiptDocument(withGuests, { language: 'en' });
    expect(receipt).toMatch(/<th>GUESTS<\/th><td>4<\/td>/);
    expect(await renderReceiptDocument(bnOrder, { language: 'en' })).not.toContain('GUESTS');
  });

  it('sends KOTs to the kitchen printer and uses receipt copies for receipts only', () => {
    const printer = { ...useSettingsStore.getState().settings.printer, receiptPrinter: 'TM-T20', kotPrinter: 'Kitchen', receiptCopies: 2 };
    expect(defaultPrintTarget(receiptDocument(bnOrder), printer)).toEqual({ printerName: 'TM-T20', copies: 2 });
    expect(defaultPrintTarget(receiptDocument(bnOrder, { variant: 'bill' }), printer)).toEqual({ printerName: 'TM-T20', copies: 2 });
    expect(defaultPrintTarget(kotDocument(bnOrder), printer)).toEqual({ printerName: 'Kitchen', copies: 1 });
    expect(defaultPrintTarget(kotDocument(bnOrder), { ...printer, kotPrinter: '' })).toEqual({ printerName: 'TM-T20', copies: 1 });
    expect(defaultPrintTarget({ type: 'test', kind: 'kot', language: 'en' }, printer)).toEqual({ printerName: 'Kitchen', copies: 1 });
  });

  it('the test page names the printer chosen in the print dialog', async () => {
    const html = await renderDocumentHtml({ type: 'test', kind: 'receipt', language: 'en' }, { printerName: 'Counter Printer', copies: 1 });
    expect(html).toContain('TEST PRINT');
    expect(html).toContain('Counter Printer');
  });
});

describe('printing never affects saved orders', () => {
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = createMemoryStorage();
    setStorageAdapter(storage);
    usePosStore.setState({ draft: createEmptyDraft('takeaway'), isProcessingPayment: false });
    useUIStore.setState({ toasts: [], modalStack: [] });
    applyStoreData(storage.data);
    await useShiftStore.getState().openShift({ cashierName: 'Rahim', openingCash: 0 });
  });

  afterEach(async () => {
    await whenIdle();
    setStorageAdapter(null);
    Reflect.deleteProperty(window, 'electronAPI');
  });

  const addItem = (code: string) =>
    usePosStore.getState().addItem(useMenuStore.getState().items.find((item) => item.code === code)!);

  it('a printer failure keeps the completed order and reports a friendly error', async () => {
    const print = installPrintApi(new Error('printer offline'));
    addItem('BUR-001');
    const { order } = await completeCurrentOrder({ method: 'card', amountReceived: null });

    const printed = await printOrderReceipt(order);
    expect(print).toHaveBeenCalledOnce();
    expect(printed).toBe(false);
    expect(storage.data.completedOrders.map((entry: Order) => entry.id)).toEqual([order.id]);
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('print.failed');
  });

  it('auto-prints receipt and KOT after payment when enabled', async () => {
    const print = installPrintApi({ outcome: 'printed' });
    await useSettingsStore.getState().updatePrinter({ autoPrintReceipt: true, autoPrintKot: true, receiptPrinter: 'TM-T20' });
    addItem('BUR-001');
    const { order } = await completeCurrentOrder({ method: 'cash', amountReceived: 500 });

    await autoPrintAfterPayment(order);
    expect(print).toHaveBeenCalledTimes(2);
    expect(print.mock.calls[0]?.[1]).toMatchObject({ printerName: 'TM-T20', paperWidth: '80mm' });
  });

  it('KOT from the POS sends only new items and marks them as sent', async () => {
    const print = installPrintApi({ outcome: 'printed' });
    await useSettingsStore.getState().updatePrinter({ silentPrint: true });
    addItem('BUR-001');
    addItem('APP-002');
    await sendCurrentOrderToKitchen();
    expect(print).toHaveBeenCalledOnce();
    expect(usePosStore.getState().draft.items.every((item) => item.sentToKitchen === item.quantity)).toBe(true);
    expect(usePosStore.getState().draft.kotCount).toBe(1);

    addItem('BUR-001'); // one more burger → only the new one goes to the kitchen
    await sendCurrentOrderToKitchen();
    const secondHtml = print.mock.calls[1]?.[0] ?? '';
    expect(secondHtml).toContain('কিচেন টিকিট #2');
    expect(secondHtml).toContain('অতিরিক্ত আইটেম');
    expect(secondHtml).not.toContain('ফ্রেঞ্চ ফ্রাই');

    await sendCurrentOrderToKitchen();
    expect(print).toHaveBeenCalledTimes(2);
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('print.noNewKotItems');
  });

  it('without "print without dialog", KOT opens the print dialog and marks items only once printed', async () => {
    const print = installPrintApi({ outcome: 'printed' });
    addItem('BUR-001');

    const sending = sendCurrentOrderToKitchen();
    const dialog = await waitForPrintDialog();
    expect(dialog.document).toMatchObject({ type: 'kot', ticketNumber: 1, additional: false });
    expect(dialog.successKey).toBe('print.kotPrinted');
    expect(print).not.toHaveBeenCalled();

    // The dialog printed the ticket and closes itself.
    settlePrintDialog(dialog.requestId, true);
    useUIStore.getState().closeModal();
    await sending;
    expect(usePosStore.getState().draft.items.every((item) => item.sentToKitchen === item.quantity)).toBe(true);
    expect(usePosStore.getState().draft.kotCount).toBe(1);
  });

  it('closing the print dialog without printing leaves the items unsent', async () => {
    installPrintApi({ outcome: 'printed' });
    addItem('BUR-001');

    const sending = sendCurrentOrderToKitchen();
    await waitForPrintDialog();
    useUIStore.getState().closeAllModals();
    await sending;
    expect(usePosStore.getState().draft.items.every((item) => !item.sentToKitchen)).toBe(true);
    expect(usePosStore.getState().draft.kotCount).toBe(0);
  });

  it('a direct print on a missing printer explains why and falls back to the print dialog', async () => {
    const print = installPrintApi({ outcome: 'failed', failure: 'printer-not-found', reason: 'printer "Gone" not found' });
    await useSettingsStore.getState().updatePrinter({ silentPrint: true, kotPrinter: 'Gone' });
    addItem('BUR-001');

    const sending = sendCurrentOrderToKitchen();
    await waitForPrintDialog();
    expect(print).toHaveBeenCalledOnce();
    expect(print.mock.calls[0]?.[1]).toMatchObject({ printerName: 'Gone' });
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('print.printerNotFound');

    useUIStore.getState().closeModal();
    await sending;
    expect(usePosStore.getState().draft.kotCount).toBe(0);
  });

  it('prints on the printer and copies chosen in the print dialog', async () => {
    const print = installPrintApi({ outcome: 'printed' });
    const printed = await printDocumentNow(receiptDocument(bnOrder), 'print.receiptPrinted', { printerName: 'Bar Printer', copies: 3 });
    expect(printed).toBe(true);
    expect(print.mock.calls[0]?.[1]).toEqual({ printerName: 'Bar Printer', copies: 3, paperWidth: '80mm', title: 'রসিদ ORD-20260910-0001' });
  });

  it('Save as PDF suggests a file name and tells where the file was saved', async () => {
    const filePath = 'C:\\Users\\cashier\\Documents\\receipt-ORD-20260910-0001.pdf';
    const print = installPrintApi({ outcome: 'printed' }, { ok: true, filePath });

    expect(await saveDocumentPdf(receiptDocument(bnOrder))).toBe(true);
    const [html, options] = print.savePdf.mock.calls[0] ?? [];
    expect(options).toEqual({ paperWidth: '80mm', fileName: 'receipt-ORD-20260910-0001' });
    expect(html).toContain('ORD-20260910-0001');
    expect(useUIStore.getState().toasts.at(-1)).toMatchObject({ tone: 'success', message: { key: 'print.pdfSaved', params: { path: filePath } } });
    expect(print).not.toHaveBeenCalled();
  });

  it('cancelling the PDF save dialog is silent; a write error is reported', async () => {
    installPrintApi({ outcome: 'printed' }, { ok: false, reason: 'cancelled' });
    expect(await saveDocumentPdf(kotDocument(bnOrder))).toBe(false);
    expect(useUIStore.getState().toasts).toHaveLength(0);

    installPrintApi({ outcome: 'printed' }, { ok: false, reason: 'failed' });
    expect(await saveDocumentPdf(kotDocument(bnOrder))).toBe(false);
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('print.pdfFailed');
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintDialog } from '@/components/printing/PrintDialog';
import { applyStoreData } from '@/services/bootstrap';
import { getPrintFontCss } from '@/services/printFonts';
import { setStorageAdapter } from '@/services/storage';
import { useUIStore } from '@/store/uiStore';
import type { PrintDocument } from '@/types';
import type { ElectronAPI, ExportResult, PrinterInfo, PrintJobOptions, PrintResult, SavePdfOptions } from '../../electron/types/electron';
import { makeShift } from '../helpers/factories';
import { createMemoryStorage } from '../helpers/memoryStorage';

const PRINTERS: PrinterInfo[] = [
  { name: 'EPSON-TM-T20', displayName: 'Epson TM-T20', description: '' },
  { name: 'Kitchen', displayName: 'Kitchen printer', description: '' },
];

function installApi(printers: PrinterInfo[] = PRINTERS) {
  const receipt = vi.fn(async (_html: string, _options: PrintJobOptions): Promise<PrintResult> => ({ outcome: 'printed' }));
  const savePdf = vi.fn(
    async (_html: string, _options: SavePdfOptions): Promise<ExportResult> => ({ ok: true, filePath: 'C:\\Docs\\shift.pdf' }),
  );
  const api = {
    print: { receipt, kot: receipt, savePdf, getPrinters: vi.fn(async () => printers) },
    app: { setNativeTheme: vi.fn(async () => undefined) },
  } as unknown as ElectronAPI;
  Object.defineProperty(window, 'electronAPI', { value: api, configurable: true, writable: true });
  return { receipt, savePdf };
}

const shiftReport: PrintDocument = {
  type: 'shiftReport',
  shift: makeShift({ cashierName: 'Polash', openedAt: new Date(2026, 8, 10, 21, 35).toISOString() }),
  language: 'bn',
};

function renderDialog(onDone = vi.fn()) {
  render(<PrintDialog document={shiftReport} title="Shift" successKey="print.reportPrinted" onClose={vi.fn()} onDone={onDone} />);
  return onDone;
}

// The embedded print font is transformed on first use, which is slow when the
// whole suite runs in parallel. Load it once so no test pays for it — and a
// slow print can never finish after its test, inside the next one.
beforeAll(() => getPrintFontCss(), 30_000);

beforeEach(() => {
  const storage = createMemoryStorage();
  setStorageAdapter(storage);
  applyStoreData(storage.data);
  useUIStore.setState({ toasts: [], modalStack: [] });
});

afterEach(() => {
  cleanup();
  setStorageAdapter(null);
  Reflect.deleteProperty(window, 'electronAPI');
});

describe('PrintDialog', { timeout: 15_000 }, () => {
  it('previews the document and prints it on the chosen printer and copies', async () => {
    const { receipt } = installApi();
    const onDone = renderDialog();

    expect(screen.getByText('শিফট রিপোর্ট')).toBeTruthy();
    expect(screen.getByText('Polash')).toBeTruthy();

    const printer = screen.getByLabelText('প্রিন্টার') as HTMLSelectElement;
    await waitFor(() => expect(printer.options).toHaveLength(3), { timeout: 5000 });
    expect(printer.value).toBe('');
    fireEvent.change(printer, { target: { value: 'Kitchen' } });
    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'প্রিন্ট' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(receipt.mock.calls[0]?.[1]).toMatchObject({ printerName: 'Kitchen', copies: 2, paperWidth: '80mm' });
    expect(useUIStore.getState().toasts.at(-1)?.message.key).toBe('print.reportPrinted');
  });

  it('saves the document as PDF instead of printing', async () => {
    const { receipt, savePdf } = installApi();
    const onDone = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'PDF হিসেবে সংরক্ষণ' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce(), { timeout: 5000 });
    expect(savePdf.mock.calls[0]?.[1]).toEqual({ paperWidth: '80mm', fileName: 'shift-report-2026-09-10-2135' });
    expect(receipt).not.toHaveBeenCalled();
    expect(useUIStore.getState().toasts.at(-1)?.message).toMatchObject({ key: 'print.pdfSaved', params: { path: 'C:\\Docs\\shift.pdf' } });
  });

  it('points to Save as PDF when no printer is installed', async () => {
    installApi([]);
    renderDialog();
    expect(await screen.findByText(/এই কম্পিউটারে কোনো প্রিন্টার পাওয়া যায়নি/)).toBeTruthy();
  });
});

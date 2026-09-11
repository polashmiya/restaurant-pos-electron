import { useState } from 'react';
import type { TranslationKey } from '@/i18n/keys';
import { printDocumentNow, saveDocumentPdf } from '@/services/printActions';
import { defaultPrintTarget, documentPrinterKind, type PrintTarget } from '@/services/printService';
import { useSettingsStore } from '@/store/settingsStore';
import type { PrintDocument, PrintKind } from '@/types';
import { usePrinters } from './usePrinters';

export type PrintJobAction = 'print' | 'pdf';

/**
 * State and actions behind a print dialog. Printer and copies start from
 * Settings → Printer; a choice made in the dialog is kept per printer role
 * (receipt / kitchen) while the dialog is open.
 */
export function usePrintJob(document: PrintDocument, successKey: TranslationKey, onDone?: () => void) {
  const printerSettings = useSettingsStore((state) => state.settings.printer);
  const { printers, loading } = usePrinters();
  const [choices, setChoices] = useState<Partial<Record<PrintKind, Partial<PrintTarget>>>>({});
  const [busy, setBusy] = useState<PrintJobAction | null>(null);

  const kind = documentPrinterKind(document);
  const target: PrintTarget = { ...defaultPrintTarget(document, printerSettings), ...choices[kind] };
  const choose = (patch: Partial<PrintTarget>) =>
    setChoices((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));

  const run = async (action: PrintJobAction, job: () => Promise<boolean>) => {
    setBusy(action);
    try {
      if (await job()) onDone?.();
    } finally {
      setBusy(null);
    }
  };

  return {
    target,
    printers,
    loadingPrinters: loading,
    /** The action in progress; the dialog should not close meanwhile. */
    busy,
    setPrinterName: (printerName: string) => choose({ printerName }),
    setCopies: (copies: number) => choose({ copies }),
    print: () => run('print', () => printDocumentNow(document, successKey, target)),
    savePdf: () => run('pdf', () => saveDocumentPdf(document, target)),
  };
}

export type PrintJob = ReturnType<typeof usePrintJob>;

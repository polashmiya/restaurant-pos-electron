import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DocumentContext } from '@/components/printing/documentTypes';
import { KOTPrint } from '@/components/printing/KOTPrint';
import { DOCUMENT_CSS, pageCss } from '@/components/printing/printStyles';
import { ReceiptPrint } from '@/components/printing/ReceiptPrint';
import { SalesReportPrint } from '@/components/printing/SalesReportPrint';
import { ShiftReportPrint } from '@/components/printing/ShiftReportPrint';
import { TestPrint } from '@/components/printing/TestPrint';
import { APP_CONFIG } from '@/config/app.config';
import { createFormatters } from '@/hooks/useFormatters';
import { getFixedT, type Translator } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import type { AppSettings, Language, Order, OrderItem, PrintDocument, PrinterSettings, PrintKind, ReceiptVariant } from '@/types';
import { logError } from '@/utils/errors';
import { documentFileName } from '@/utils/fileNames';
import type { ExportResult, PrintJobOptions, PrintResult } from '../../electron/types/electron';
import { getPrintFontCss } from './printFonts';

/* ==========================================================================
   Print documents: a PrintDocument → React component → self-contained HTML
   (inline CSS, embedded font) → Electron print manager, which prints it
   silently on the chosen printer or saves it as PDF. The same component is
   the live preview in the print dialog. In a plain browser, window.print()
   on a hidden iframe is used.
   ========================================================================== */

/** Printer and number of copies for one print job. */
export interface PrintTarget {
  /** System printer name; empty = system default printer. */
  printerName: string;
  copies: number;
}

/** Document context (translations, formatting, restaurant) for one language. */
export function createDocumentContext(
  language: Language,
  settings: AppSettings = useSettingsStore.getState().settings,
): DocumentContext {
  return {
    language,
    t: getFixedT(language),
    format: createFormatters({ language, numberFormat: settings.numberFormat, currencySymbol: settings.currencySymbol }),
    restaurant: {
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      taxId: settings.taxId,
      footer: settings.receiptFooter,
    },
    paperWidth: settings.printer.paperWidth,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Wraps rendered markup into a complete, offline HTML document. */
export async function buildPrintDocument(body: ReactElement, context: DocumentContext, title: string): Promise<string> {
  const fonts = await getPrintFontCss();
  const markup = renderToStaticMarkup(body);
  return [
    '<!doctype html>',
    `<html lang="${context.language}" dir="ltr">`,
    '<head><meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${fonts}${DOCUMENT_CSS}${pageCss(context.paperWidth)}</style>`,
    '</head>',
    `<body>${markup}</body>`,
    '</html>',
  ].join('');
}

export interface ReceiptPrintOptions {
  language?: Language;
  variant?: ReceiptVariant;
  reprint?: boolean;
}

export function receiptDocument(order: Order, options: ReceiptPrintOptions = {}): PrintDocument {
  return { type: 'receipt', order, language: options.language ?? order.language, variant: options.variant, reprint: options.reprint };
}

export interface KotPrintOptions {
  language?: Language;
  items?: OrderItem[];
  ticketNumber?: number;
  additional?: boolean;
  reprint?: boolean;
}

export function kotDocument(order: Order, options: KotPrintOptions = {}): PrintDocument {
  return { type: 'kot', order, ...options, language: options.language ?? order.language };
}

/** Which configured printer a document goes to. */
export function documentPrinterKind(document: PrintDocument): PrintKind {
  if (document.type === 'kot') return 'kot';
  return document.type === 'test' ? document.kind : 'receipt';
}

/** Printer and copies from Settings → Printer (receipt copies apply to receipts and bills). */
export function defaultPrintTarget(
  document: PrintDocument,
  printer: PrinterSettings = useSettingsStore.getState().settings.printer,
): PrintTarget {
  const maxCopies = Math.max(...APP_CONFIG.print.copyOptions);
  return {
    printerName: documentPrinterKind(document) === 'kot' ? printer.kotPrinter || printer.receiptPrinter : printer.receiptPrinter,
    copies: document.type === 'receipt' ? Math.min(Math.max(Math.trunc(printer.receiptCopies) || 1, 1), maxCopies) : 1,
  };
}

/** Title of a document in its own language (print job name, PDF title). */
export function documentTitle(document: PrintDocument, t: Translator): string {
  switch (document.type) {
    case 'receipt':
      return `${t(document.variant === 'bill' ? 'receipt.bill' : 'receipt.title')} ${document.order.orderNumber}`;
    case 'kot':
      return `${t('kot.title')} ${document.order.orderNumber}`;
    case 'shiftReport':
      return t('shiftReport.title');
    case 'salesReport':
      return t('salesReport.title');
    case 'test':
      return t('print.testTitle');
  }
}

/**
 * The document as a React element — the in-app preview and the printed page
 * are the same markup. `target` is the printer chosen in the print dialog
 * (the test page names it).
 */
export function renderDocumentElement(
  document: PrintDocument,
  context: DocumentContext,
  printer: PrinterSettings,
  target: PrintTarget = defaultPrintTarget(document, printer),
): ReactElement {
  switch (document.type) {
    case 'receipt':
      return <ReceiptPrint order={document.order} context={context} variant={document.variant} reprint={document.reprint} />;
    case 'kot':
      return (
        <KOTPrint
          order={document.order}
          items={document.items}
          context={context}
          ticketNumber={document.ticketNumber}
          additional={document.additional}
          reprint={document.reprint}
          showPrices={printer.showPricesOnKot}
        />
      );
    case 'shiftReport':
      return <ShiftReportPrint shift={document.shift} context={context} />;
    case 'salesReport':
      return <SalesReportPrint report={document.report} context={context} />;
    case 'test':
      return <TestPrint context={context} printerLabel={target.printerName || context.t('settings.printer.systemDefault')} />;
  }
}

/** Complete, self-contained HTML of a document for the printer or a PDF file. */
export async function renderDocumentHtml(document: PrintDocument, target?: PrintTarget): Promise<string> {
  const settings = useSettingsStore.getState().settings;
  const context = createDocumentContext(document.language, settings);
  return buildPrintDocument(renderDocumentElement(document, context, settings.printer, target), context, documentTitle(document, context.t));
}

export function renderReceiptDocument(order: Order, options: ReceiptPrintOptions = {}): Promise<string> {
  return renderDocumentHtml(receiptDocument(order, options));
}

export function renderKotDocument(order: Order, options: KotPrintOptions = {}): Promise<string> {
  return renderDocumentHtml(kotDocument(order, options));
}

/** window.print() fallback when running outside Electron (its dialog can also save a PDF). */
function printInBrowser(html: string): Promise<PrintResult> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0', insetInlineEnd: '0', bottom: '0' });
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        resolve({ outcome: 'printed' });
      } catch (error) {
        resolve({ outcome: 'failed', failure: 'error', reason: error instanceof Error ? error.message : String(error) });
      } finally {
        window.setTimeout(() => frame.remove(), 1500);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

/** Prints a document on the given printer (default: Settings → Printer). Never throws. */
export async function dispatchPrint(document: PrintDocument, target: PrintTarget = defaultPrintTarget(document)): Promise<PrintResult> {
  try {
    const html = await renderDocumentHtml(document, target);
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    if (!api) return await printInBrowser(html);
    const options: PrintJobOptions = {
      printerName: target.printerName,
      copies: target.copies,
      paperWidth: useSettingsStore.getState().settings.printer.paperWidth,
      title: documentTitle(document, getFixedT(document.language)),
    };
    return documentPrinterKind(document) === 'kot' ? await api.print.kot(html, options) : await api.print.receipt(html, options);
  } catch (error) {
    return { outcome: 'failed', failure: 'error', reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Saves a document as a PDF file (desktop: save dialog). In the browser the
 * print dialog opens instead — its "Save as PDF" printer does the same; the
 * result then has no file path. Never throws.
 */
export async function saveDocumentAsPdf(document: PrintDocument, target?: PrintTarget): Promise<ExportResult> {
  try {
    const html = await renderDocumentHtml(document, target);
    const api = window.electronAPI;
    if (!api) {
      const result = await printInBrowser(html);
      return result.outcome === 'failed' ? { ok: false, reason: 'failed' } : { ok: true, filePath: '' };
    }
    return await api.print.savePdf(html, {
      paperWidth: useSettingsStore.getState().settings.printer.paperWidth,
      fileName: documentFileName(document),
    });
  } catch (error) {
    logError('pdf', error);
    return { ok: false, reason: 'failed' };
  }
}

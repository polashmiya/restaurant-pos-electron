import type { Language } from './common';
import type { Order, OrderItem } from './order';
import type { SalesReport } from './report';
import type { Shift } from './shift';

/** Printer role: KOTs go to the kitchen printer, every other document to the receipt printer. */
export type PrintKind = 'receipt' | 'kot';

/** `bill` = pre-payment bill for the table; `receipt` = paid receipt. */
export type ReceiptVariant = 'receipt' | 'bill';

/**
 * A printable document, rendered on demand in its own language: as a live
 * preview in the print dialog, and as self-contained HTML for the printer
 * or a PDF file.
 */
export type PrintDocument =
  | { type: 'receipt'; order: Order; language: Language; variant?: ReceiptVariant; reprint?: boolean }
  | {
      type: 'kot';
      order: Order;
      language: Language;
      /** Only these items (incremental KOT); defaults to the whole order. */
      items?: OrderItem[];
      ticketNumber?: number;
      additional?: boolean;
      reprint?: boolean;
    }
  | { type: 'shiftReport'; shift: Shift; language: Language }
  | { type: 'salesReport'; report: SalesReport; language: Language }
  | { type: 'test'; kind: PrintKind; language: Language };

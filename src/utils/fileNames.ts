import { APP_CONFIG } from '@/config/app.config';
import type { PrintDocument, ReportRange } from '@/types';
import { formatIsoDay } from './format';
import { addDays } from './reports';

/** "2026-09-10" for a single day, "2026-09-04-to-2026-09-10" for a range (end exclusive). */
export function rangeFileStem(range: ReportRange): string {
  const first = formatIsoDay(range.start);
  const last = formatIsoDay(addDays(range.end, -1));
  return first === last ? first : `${first}-to-${last}`;
}

function timeStem(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}`;
}

/** Suggested file name (without extension) when a document is saved as PDF. */
export function documentFileName(document: PrintDocument): string {
  const prefixes = APP_CONFIG.print.fileNamePrefixes;
  switch (document.type) {
    case 'receipt':
      return `${document.variant === 'bill' ? prefixes.bill : prefixes.receipt}-${document.order.orderNumber}`;
    case 'kot': {
      const ticket = document.ticketNumber && document.ticketNumber > 1 ? `-${document.ticketNumber}` : '';
      return `${prefixes.kot}-${document.order.orderNumber}${ticket}`;
    }
    case 'shiftReport': {
      const opened = new Date(document.shift.openedAt);
      return `${prefixes.shiftReport}-${formatIsoDay(opened)}-${timeStem(opened)}`;
    }
    case 'salesReport': {
      const range = { start: new Date(document.report.range.start), end: new Date(document.report.range.end) };
      return `${APP_CONFIG.reports.fileNamePrefix}-${rangeFileStem(range)}`;
    }
    case 'test':
      return prefixes.test;
  }
}

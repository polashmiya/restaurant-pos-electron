import { describe, expect, it } from 'vitest';
import type { SalesReport } from '@/types';
import { documentFileName } from '@/utils/fileNames';
import { printerSelectOptions } from '@/utils/printers';
import { makeOrder, makeShift } from '../helpers/factories';

describe('documentFileName (Save as PDF)', () => {
  const order = makeOrder({ orderNumber: 'ORD-20260910-0007' });

  it('names order documents after the order number', () => {
    expect(documentFileName({ type: 'receipt', order, language: 'bn' })).toBe('receipt-ORD-20260910-0007');
    expect(documentFileName({ type: 'receipt', order, language: 'bn', variant: 'bill' })).toBe('bill-ORD-20260910-0007');
    expect(documentFileName({ type: 'kot', order, language: 'bn' })).toBe('kot-ORD-20260910-0007');
    expect(documentFileName({ type: 'kot', order, language: 'bn', ticketNumber: 3, additional: true })).toBe('kot-ORD-20260910-0007-3');
  });

  it('names reports after their local date', () => {
    const shift = makeShift({ openedAt: new Date(2026, 8, 10, 9, 35).toISOString() });
    expect(documentFileName({ type: 'shiftReport', shift, language: 'en' })).toBe('shift-report-2026-09-10-0935');

    const week = { range: { start: new Date(2026, 8, 4).toISOString(), end: new Date(2026, 8, 11).toISOString() } } as SalesReport;
    expect(documentFileName({ type: 'salesReport', report: week, language: 'en' })).toBe('sales-report-2026-09-04-to-2026-09-10');
    const day = { range: { start: new Date(2026, 8, 10).toISOString(), end: new Date(2026, 8, 11).toISOString() } } as SalesReport;
    expect(documentFileName({ type: 'salesReport', report: day, language: 'bn' })).toBe('sales-report-2026-09-10');

    expect(documentFileName({ type: 'test', kind: 'kot', language: 'en' })).toBe('test-print');
  });
});

describe('printerSelectOptions', () => {
  const printers = [
    { name: 'EPSON-TM-T20', displayName: 'Epson TM-T20', description: '' },
    { name: 'Kitchen', displayName: 'Kitchen printer', description: '' },
  ];

  it('lists the default entry and the installed printers', () => {
    expect(printerSelectOptions(printers, '', 'Default')).toEqual([
      { value: '', label: 'Default' },
      { value: 'EPSON-TM-T20', label: 'Epson TM-T20' },
      { value: 'Kitchen', label: 'Kitchen printer' },
    ]);
  });

  it('keeps a saved printer that is no longer installed, marked once the list has loaded', () => {
    expect(printerSelectOptions(printers, 'Old USB', 'Default').at(-1)).toEqual({ value: 'Old USB', label: 'Old USB' });
    expect(printerSelectOptions(printers, 'Old USB', 'Default', (name) => `${name} (not found)`).at(-1)).toEqual({
      value: 'Old USB',
      label: 'Old USB (not found)',
    });
  });
});

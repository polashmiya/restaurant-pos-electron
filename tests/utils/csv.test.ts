import { describe, expect, it } from 'vitest';
import { buildOrdersCsv, reportFileName } from '@/services/reportActions';
import { escapeCsvCell, splitLocalDateTime, toCsv } from '@/utils/csv';
import { resolveReportRange } from '@/utils/reports';
import { makeOrder, makeOrderItem } from '../helpers/factories';

describe('CSV', () => {
  it('quotes separators, quotes and line breaks', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('two\nlines')).toBe('"two\nlines"');
    expect(escapeCsvCell(12.5)).toBe('12.5');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('neutralizes spreadsheet formulas in text', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(escapeCsvCell('+8801711')).toBe("'+8801711");
    expect(escapeCsvCell('@cmd')).toBe("'@cmd");
    expect(escapeCsvCell(-5)).toBe('-5');
  });

  it('joins rows with CRLF', () => {
    expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2\r\n');
  });

  it('writes local date and 24-hour time', () => {
    expect(splitLocalDateTime(new Date(2026, 8, 10, 7, 5))).toEqual({ date: '2026-09-10', time: '07:05' });
  });

  it('exports one row per order with localized headers and plain numbers', () => {
    const order = makeOrder({
      items: [makeOrderItem({ quantity: 2 }), makeOrderItem({ id: 'l2', name: { bn: 'কোক', en: 'Coke' }, price: 60 })],
      customer: { name: 'Rahim, Jr.', phone: '01711-000000' },
      cashierName: 'Nusrat',
    });
    const [header, row] = buildOrdersCsv([order], 'en').trim().split('\r\n');
    expect(header).toBe(
      'Order no.,Date,Time,Status,Order type,Table,Customer,Phone,Items,Qty,Subtotal,Discount,Tax,Total,Payment,Reference,Cashier',
    );
    expect(row).toContain('ORD-20260910-0001');
    expect(row).toContain('"Rahim, Jr."');
    expect(row).toContain('Chicken Burger × 2; Coke × 1');
    expect(row).toContain(',3,250,0,12.5,262.5,Cash,,Nusrat');

    const bangla = buildOrdersCsv([order], 'bn');
    expect(bangla.split('\r\n')[0]).toContain('অর্ডার নম্বর');
  });

  it('names the file after the report range', () => {
    const now = new Date(2026, 8, 10, 12);
    expect(reportFileName(resolveReportRange('today', now))).toBe('sales-report-2026-09-10.csv');
    expect(reportFileName(resolveReportRange('last7', now))).toBe('sales-report-2026-09-04-to-2026-09-10.csv');
  });
});

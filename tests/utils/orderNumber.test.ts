import { describe, expect, it } from 'vitest';
import { generateOrderNumber, isOrderNumber } from '@/utils/orderNumber';

const TODAY = new Date(2026, 8, 10, 14, 30);

describe('order numbers', () => {
  it('uses the ORD-YYYYMMDD-0001 format', () => {
    const result = generateOrderNumber({ date: '', sequence: 0 }, new Set(), TODAY);
    expect(result.orderNumber).toBe('ORD-20260910-0001');
    expect(result.counter).toEqual({ date: '20260910', sequence: 1 });
    expect(isOrderNumber(result.orderNumber)).toBe(true);
  });

  it('continues the daily sequence from the persisted counter', () => {
    const result = generateOrderNumber({ date: '20260910', sequence: 3 }, new Set(), TODAY);
    expect(result.orderNumber).toBe('ORD-20260910-0004');
  });

  it('restarts the sequence on a new day', () => {
    const result = generateOrderNumber({ date: '20260909', sequence: 87 }, new Set(), TODAY);
    expect(result.orderNumber).toBe('ORD-20260910-0001');
  });

  it('never reuses an existing number (does not rely on array length)', () => {
    const existing = new Set(['ORD-20260910-0001', 'ORD-20260910-0002']);
    const result = generateOrderNumber({ date: '', sequence: 0 }, existing, TODAY);
    expect(result.orderNumber).toBe('ORD-20260910-0003');
    expect(result.counter.sequence).toBe(3);
  });

  it('produces unique numbers for many consecutive orders', () => {
    let counter = { date: '', sequence: 0 };
    const numbers = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const next = generateOrderNumber(counter, numbers, TODAY);
      numbers.add(next.orderNumber);
      counter = next.counter;
    }
    expect(numbers.size).toBe(500);
  });
});

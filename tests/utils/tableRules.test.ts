import { describe, expect, it } from 'vitest';
import type { DiningTable } from '@/types';
import {
  canDeleteTable,
  cancelTableReservation,
  getTableAction,
  markTableOccupied,
  markTableWaiting,
  occupyTable,
  releaseTable,
  reserveTable,
} from '@/utils/tableRules';

const base: DiningTable = { id: 'table-05', number: 5, name: '05', capacity: 4, status: 'available' };
const reservation = { guestName: 'Karim', time: '19:30', guests: 4, createdAt: '2026-09-10T10:00:00Z' };

describe('table rules', () => {
  it('maps each status to its tap action (master spec §59)', () => {
    expect(getTableAction(base)).toBe('start-order');
    expect(getTableAction({ ...base, status: 'occupied', activeOrderId: 'o1' })).toBe('open-order');
    expect(getTableAction({ ...base, status: 'reserved', reservation })).toBe('view-reservation');
    expect(getTableAction({ ...base, status: 'waiting', activeOrderId: 'o1' })).toBe('open-bill');
  });

  it('occupies a table for one order and clears a reservation', () => {
    const occupied = occupyTable({ ...base, status: 'reserved', reservation }, 'order-1');
    expect(occupied.status).toBe('occupied');
    expect(occupied.activeOrderId).toBe('order-1');
    expect(occupied.reservation).toBeUndefined();
  });

  it('never allows two independent active orders on the same table', () => {
    const occupied = occupyTable(base, 'order-1');
    expect(() => occupyTable(occupied, 'order-2')).toThrow();
    expect(occupyTable(occupied, 'order-1').activeOrderId).toBe('order-1');
  });

  it('releases a table after payment', () => {
    const released = releaseTable(occupyTable(base, 'order-1'));
    expect(released.status).toBe('available');
    expect(released.activeOrderId).toBeUndefined();
  });

  it('moves between occupied and waiting for bill only with an active order', () => {
    const occupied = occupyTable(base, 'order-1');
    expect(markTableWaiting(occupied).status).toBe('waiting');
    expect(markTableOccupied(markTableWaiting(occupied)).status).toBe('occupied');
    expect(() => markTableWaiting(base)).toThrow();
  });

  it('reserves only available tables and cancels reservations', () => {
    const reserved = reserveTable(base, reservation);
    expect(reserved.status).toBe('reserved');
    expect(() => reserveTable(occupyTable(base, 'o1'), reservation)).toThrow();
    const cancelled = cancelTableReservation(reserved);
    expect(cancelled.status).toBe('available');
    expect(cancelled.reservation).toBeUndefined();
  });

  it('only allows deleting free tables', () => {
    expect(canDeleteTable(base)).toBe(true);
    expect(canDeleteTable(occupyTable(base, 'o1'))).toBe(false);
    expect(canDeleteTable(reserveTable(base, reservation))).toBe(false);
  });
});

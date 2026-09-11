import type { DiningTable, Reservation } from '@/types';

/*
 * Table business rules (master spec §59, §97). Pure functions — the table
 * store and order workflows use them so the rules live in one place.
 */

export type TableAction = 'start-order' | 'open-order' | 'view-reservation' | 'open-bill';

/** What tapping a table does, by status. */
export function getTableAction(table: DiningTable): TableAction {
  switch (table.status) {
    case 'available':
      return 'start-order';
    case 'occupied':
      return 'open-order';
    case 'reserved':
      return 'view-reservation';
    case 'waiting':
      return 'open-bill';
  }
}

/** True when the table is bound to an order other than `orderId`. */
export function isTakenByAnotherOrder(table: DiningTable, orderId: string): boolean {
  return Boolean(table.activeOrderId && table.activeOrderId !== orderId);
}

export function occupyTable(table: DiningTable, orderId: string, now: Date = new Date()): DiningTable {
  if (isTakenByAnotherOrder(table, orderId)) {
    throw new Error(`Table ${table.name} already has an active order`);
  }
  const { reservation: _seated, ...rest } = table;
  const alreadyOccupied = table.activeOrderId === orderId && (table.status === 'occupied' || table.status === 'waiting');
  return {
    ...rest,
    status: alreadyOccupied ? table.status : 'occupied',
    activeOrderId: orderId,
    statusSince: alreadyOccupied ? table.statusSince : now.toISOString(),
  };
}

export function releaseTable(table: DiningTable, now: Date = new Date()): DiningTable {
  const { activeOrderId: _released, ...rest } = table;
  return {
    ...rest,
    status: table.reservation ? 'reserved' : 'available',
    statusSince: now.toISOString(),
  };
}

export function markTableWaiting(table: DiningTable, now: Date = new Date()): DiningTable {
  if (!table.activeOrderId) throw new Error(`Table ${table.name} has no active order`);
  return { ...table, status: 'waiting', statusSince: now.toISOString() };
}

export function markTableOccupied(table: DiningTable, now: Date = new Date()): DiningTable {
  if (!table.activeOrderId) throw new Error(`Table ${table.name} has no active order`);
  return { ...table, status: 'occupied', statusSince: now.toISOString() };
}

export function reserveTable(table: DiningTable, reservation: Reservation, now: Date = new Date()): DiningTable {
  if (table.status !== 'available' || table.activeOrderId) {
    throw new Error(`Table ${table.name} is not available for reservation`);
  }
  return { ...table, status: 'reserved', reservation, statusSince: now.toISOString() };
}

export function cancelTableReservation(table: DiningTable, now: Date = new Date()): DiningTable {
  const { reservation: _cancelled, ...rest } = table;
  return {
    ...rest,
    status: table.activeOrderId ? table.status : 'available',
    statusSince: now.toISOString(),
  };
}

export function canDeleteTable(table: DiningTable): boolean {
  return !table.activeOrderId && !table.reservation && table.status === 'available';
}

export function sortTables(tables: readonly DiningTable[]): DiningTable[] {
  return [...tables].sort((a, b) => a.number - b.number);
}

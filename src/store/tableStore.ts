import { useMemo } from 'react';
import { create } from 'zustand';
import { getStorage } from '@/services/storage';
import type { DiningTable, Reservation, TableStatus } from '@/types';
import { AppError } from '@/utils/errors';
import {
  canDeleteTable,
  cancelTableReservation,
  markTableOccupied,
  markTableWaiting,
  reserveTable,
  sortTables,
} from '@/utils/tableRules';

interface TableState {
  tables: DiningTable[];

  hydrate: (tables: DiningTable[]) => void;
  /** Commits tables that were already persisted by an order workflow. */
  setTables: (tables: DiningTable[]) => void;

  reserve: (tableId: string, reservation: Reservation) => Promise<void>;
  cancelReservation: (tableId: string) => Promise<void>;
  /** Occupied ↔ Waiting for bill. */
  setWaitingForBill: (tableId: string, waiting: boolean) => Promise<void>;

  /** Table management (Settings → Tables). */
  saveTable: (table: DiningTable) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
}

async function persistTables(tables: DiningTable[]): Promise<void> {
  try {
    await getStorage().set('tables', tables);
  } catch (error) {
    throw new AppError('storage', 'errors.dataSaveFailed', { cause: error });
  }
}

export const useTableStore = create<TableState>()((set, get) => {
  /** Applies a rule to one table, persists, then updates state. */
  const update = async (tableId: string, change: (table: DiningTable) => DiningTable) => {
    const tables = get().tables;
    const target = tables.find((table) => table.id === tableId);
    if (!target) throw new AppError('not-found', 'errors.unexpected', { detail: `Table ${tableId} not found` });
    const next = tables.map((table) => (table.id === tableId ? change(table) : table));
    await persistTables(next);
    set({ tables: next });
  };

  return {
    tables: [],

    hydrate: (tables) => set({ tables: sortTables(tables) }),
    setTables: (tables) => set({ tables: sortTables(tables) }),

    reserve: (tableId, reservation) => update(tableId, (table) => reserveTable(table, reservation)),
    cancelReservation: (tableId) => update(tableId, (table) => cancelTableReservation(table)),
    setWaitingForBill: (tableId, waiting) =>
      update(tableId, (table) => (waiting ? markTableWaiting(table) : markTableOccupied(table))),

    saveTable: async (table) => {
      const tables = get().tables;
      if (tables.some((existing) => existing.id !== table.id && existing.number === table.number)) {
        throw new AppError('conflict', 'settings.tables.numberExists');
      }
      const name = table.name.trim().toLocaleLowerCase();
      if (tables.some((existing) => existing.id !== table.id && existing.name.trim().toLocaleLowerCase() === name)) {
        throw new AppError('conflict', 'settings.tables.nameExists');
      }
      const exists = tables.some((existing) => existing.id === table.id);
      const next = sortTables(exists ? tables.map((existing) => (existing.id === table.id ? table : existing)) : [...tables, table]);
      await persistTables(next);
      set({ tables: next });
    },

    deleteTable: async (tableId) => {
      const target = get().tables.find((table) => table.id === tableId);
      if (!target) return;
      if (!canDeleteTable(target)) throw new AppError('conflict', 'settings.tables.inUse');
      const next = get().tables.filter((table) => table.id !== tableId);
      await persistTables(next);
      set({ tables: next });
    },
  };
});

export function useTableCounts(): Record<TableStatus, number> {
  const tables = useTableStore((state) => state.tables);
  return useMemo(() => {
    const counts: Record<TableStatus, number> = { available: 0, occupied: 0, reserved: 0, waiting: 0 };
    for (const table of tables) counts[table.status] += 1;
    return counts;
  }, [tables]);
}

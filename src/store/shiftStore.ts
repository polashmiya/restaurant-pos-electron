import { create } from 'zustand';
import { getStorage } from '@/services/storage';
import type { Shift } from '@/types';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';
import { roundMoney } from '@/utils/money';
import { createEmptyShiftTotals } from '@/utils/shiftMath';

export interface OpenShiftInput {
  cashierName: string;
  openingCash: number;
}

export interface CloseShiftInput {
  closingCash: number;
  notes?: string;
}

interface ShiftState {
  shifts: Shift[];

  hydrate: (shifts: Shift[]) => void;
  /** Commits shifts already persisted by an order workflow. */
  setShifts: (shifts: Shift[]) => void;
  openShift: (input: OpenShiftInput) => Promise<Shift>;
  closeShift: (input: CloseShiftInput) => Promise<Shift>;
}

async function persistShifts(shifts: Shift[]): Promise<void> {
  try {
    await getStorage().set('shifts', shifts);
  } catch (error) {
    throw new AppError('storage', 'errors.dataSaveFailed', { cause: error });
  }
}

export const useShiftStore = create<ShiftState>()((set, get) => ({
  shifts: [],

  hydrate: (shifts) => set({ shifts }),
  setShifts: (shifts) => set({ shifts }),

  openShift: async ({ cashierName, openingCash }) => {
    if (get().shifts.some((shift) => shift.status === 'open')) {
      throw new AppError('conflict', 'shift.alreadyOpen');
    }
    const shift: Shift = {
      id: createId('shift'),
      openedAt: new Date().toISOString(),
      cashierName: cashierName.trim(),
      openingCash: roundMoney(Math.max(0, openingCash)),
      ...createEmptyShiftTotals(),
      status: 'open',
    };
    const next = [...get().shifts, shift];
    await persistShifts(next);
    set({ shifts: next });
    return shift;
  },

  closeShift: async ({ closingCash, notes }) => {
    const current = get().shifts.find((shift) => shift.status === 'open');
    if (!current) throw new AppError('not-found', 'shift.noOpenShift');
    const closed: Shift = {
      ...current,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closingCash: roundMoney(Math.max(0, closingCash)),
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    };
    const next = get().shifts.map((shift) => (shift.id === current.id ? closed : shift));
    await persistShifts(next);
    set({ shifts: next });
    return closed;
  },
}));

export function selectCurrentShift(state: { shifts: Shift[] }): Shift | undefined {
  return state.shifts.find((shift) => shift.status === 'open');
}

export function useCurrentShift(): Shift | undefined {
  return useShiftStore(selectCurrentShift);
}

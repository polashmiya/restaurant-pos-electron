import { useMemo } from 'react';
import { create } from 'zustand';
import { APP_CONFIG } from '@/config/app.config';
import type { Customer, DiscountInput, MenuItem, OrderDraft, OrderItem, OrderTotals } from '@/types';
import { calculateOrderTotals, getUniformTaxRate } from '@/utils/calculations';
import { addItemToLines, buildItemNote, createEmptyDraft } from '@/utils/orderHelpers';
import { useSettingsStore } from './settingsStore';

export type AddItemResult = 'added' | 'unavailable' | 'max-quantity';

/**
 * The order currently being built on the POS screen. Only source data lives
 * here (items, discount input, type, table, customer); subtotal, tax and
 * total are derived with `useCartTotals()`.
 *
 * Changes are saved automatically by services/draftSync.ts.
 */
interface PosState {
  draft: OrderDraft;
  isProcessingPayment: boolean;

  addItem: (menuItem: MenuItem) => AddItemResult;
  incrementItem: (lineId: string) => void;
  decrementItem: (lineId: string) => void;
  setItemQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  setItemNote: (lineId: string, noteTags: string[], customNote: string) => void;
  setDiscount: (discount: DiscountInput | undefined) => void;
  setCustomer: (customer: Customer | undefined) => void;
  /** Number of guests at the table; undefined = unknown. */
  setGuests: (guests: number | undefined) => void;
  /** Order type and table changes go through services/orderWorkflow.ts. */
  replaceDraft: (draft: OrderDraft) => void;
  setProcessingPayment: (processing: boolean) => void;
}

function touch(draft: OrderDraft, changes: Partial<OrderDraft>): OrderDraft {
  return { ...draft, ...changes, updatedAt: new Date().toISOString() };
}

function updateLine(draft: OrderDraft, lineId: string, change: (line: OrderItem) => OrderItem | null): OrderDraft {
  const items: OrderItem[] = [];
  for (const line of draft.items) {
    if (line.id !== lineId) {
      items.push(line);
      continue;
    }
    const next = change(line);
    if (next) items.push(next);
  }
  return touch(draft, { items });
}

const clampQuantity = (quantity: number) =>
  Math.min(Math.max(Math.trunc(quantity), 1), APP_CONFIG.order.maxItemQuantity);

export const usePosStore = create<PosState>()((set, get) => ({
  draft: createEmptyDraft(),
  isProcessingPayment: false,

  addItem: (menuItem) => {
    if (!menuItem.isAvailable) return 'unavailable';
    const draft = get().draft;
    const existing = draft.items.find((line) => line.menuItemId === menuItem.id && !line.noteTags?.length && !line.customNote);
    if (existing && existing.quantity >= APP_CONFIG.order.maxItemQuantity) return 'max-quantity';
    set({ draft: touch(draft, { items: addItemToLines(draft.items, menuItem) }) });
    return 'added';
  },

  incrementItem: (lineId) =>
    set((state) => ({
      draft: updateLine(state.draft, lineId, (line) => ({ ...line, quantity: clampQuantity(line.quantity + 1) })),
    })),

  decrementItem: (lineId) =>
    set((state) => ({
      draft: updateLine(state.draft, lineId, (line) => ({ ...line, quantity: clampQuantity(line.quantity - 1) })),
    })),

  setItemQuantity: (lineId, quantity) =>
    set((state) => ({
      draft: updateLine(state.draft, lineId, (line) => ({ ...line, quantity: clampQuantity(quantity) })),
    })),

  removeItem: (lineId) => set((state) => ({ draft: updateLine(state.draft, lineId, () => null) })),

  setItemNote: (lineId, noteTags, customNote) =>
    set((state) => ({
      draft: updateLine(state.draft, lineId, (line) => {
        const custom = customNote.trim().slice(0, APP_CONFIG.order.maxNoteLength);
        const note = buildItemNote(noteTags, custom);
        const { note: _note, noteTags: _tags, customNote: _custom, ...rest } = line;
        return {
          ...rest,
          ...(note ? { note } : {}),
          ...(noteTags.length > 0 ? { noteTags: [...noteTags] } : {}),
          ...(custom ? { customNote: custom } : {}),
        };
      }),
    })),

  setDiscount: (discount) =>
    set((state) => {
      const { discountInput: _previous, ...rest } = state.draft;
      return { draft: touch(rest as OrderDraft, discount && discount.value > 0 ? { discountInput: discount } : {}) };
    }),

  setCustomer: (customer) =>
    set((state) => {
      const { customer: _previous, ...rest } = state.draft;
      return { draft: touch(rest as OrderDraft, customer ? { customer } : {}) };
    }),

  setGuests: (guests) =>
    set((state) => {
      const { guests: _previous, ...rest } = state.draft;
      const count = guests === undefined ? 0 : Math.min(Math.max(Math.trunc(guests) || 0, 0), APP_CONFIG.order.maxGuests);
      return { draft: touch(rest as OrderDraft, count > 0 ? { guests: count } : {}) };
    }),

  replaceDraft: (draft) => set({ draft }),
  setProcessingPayment: (processing) => set({ isProcessingPayment: processing }),
}));

/* -------------------------------- Selectors -------------------------------- */

/** Derived totals of the current order (subtotal → discount → tax → total). */
export function useCartTotals(): OrderTotals {
  const items = usePosStore((state) => state.draft.items);
  const discount = usePosStore((state) => state.draft.discountInput);
  const taxRate = useSettingsStore((state) => state.settings.defaultTaxRate);
  return useMemo(() => calculateOrderTotals(items, discount, taxRate), [items, discount, taxRate]);
}

/** The tax rate shown next to "Tax", or null when items use different rates. */
export function useCartTaxRate(): number | null {
  const items = usePosStore((state) => state.draft.items);
  const taxRate = useSettingsStore((state) => state.settings.defaultTaxRate);
  return useMemo(() => getUniformTaxRate(items, taxRate), [items, taxRate]);
}

/** Quantity of each menu item in the current order (for grid badges). */
export function useCartQuantities(): Map<string, number> {
  const items = usePosStore((state) => state.draft.items);
  return useMemo(() => {
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.menuItemId, (quantities.get(item.menuItemId) ?? 0) + item.quantity);
    return quantities;
  }, [items]);
}

export function getCurrentTotals(): OrderTotals {
  const { draft } = usePosStore.getState();
  return calculateOrderTotals(draft.items, draft.discountInput, useSettingsStore.getState().settings.defaultTaxRate);
}

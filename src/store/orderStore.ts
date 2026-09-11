import { useMemo } from 'react';
import { create } from 'zustand';
import type { Order, OrderCounter } from '@/types';
import { compareOrdersNewestFirst } from '@/utils/orderHelpers';

/**
 * Orders known to the application. Writes are performed by the order
 * workflows (services/orderWorkflow.ts), which persist first and then
 * commit here — so this store only ever reflects saved data.
 */
interface OrderState {
  /** Draft (in progress / table) and held orders. */
  openOrders: Order[];
  /** Completed and cancelled orders. */
  completedOrders: Order[];
  orderCounter: OrderCounter;

  hydrate: (openOrders: Order[], completedOrders: Order[], orderCounter: OrderCounter) => void;
  setOpenOrders: (orders: Order[]) => void;
  addCompletedOrder: (order: Order) => void;
  setOrderCounter: (counter: OrderCounter) => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  openOrders: [],
  completedOrders: [],
  orderCounter: { date: '', sequence: 0 },

  hydrate: (openOrders, completedOrders, orderCounter) => set({ openOrders, completedOrders, orderCounter }),
  setOpenOrders: (orders) => set({ openOrders: orders }),
  addCompletedOrder: (order) =>
    set((state) =>
      state.completedOrders.some((existing) => existing.id === order.id)
        ? state
        : { completedOrders: [...state.completedOrders, order] },
    ),
  setOrderCounter: (counter) => set({ orderCounter: counter }),
}));

export function findOrder(orderId: string): Order | undefined {
  const { openOrders, completedOrders } = useOrderStore.getState();
  return openOrders.find((order) => order.id === orderId) ?? completedOrders.find((order) => order.id === orderId);
}

export function getAllOrderNumbers(): Set<string> {
  const { openOrders, completedOrders } = useOrderStore.getState();
  return new Set([...openOrders, ...completedOrders].map((order) => order.orderNumber));
}

/* -------------------------------- Selectors -------------------------------- */

export function useOrder(orderId: string | undefined): Order | undefined {
  const open = useOrderStore((state) => (orderId ? state.openOrders.find((order) => order.id === orderId) : undefined));
  const completed = useOrderStore((state) =>
    orderId ? state.completedOrders.find((order) => order.id === orderId) : undefined,
  );
  return open ?? completed;
}

export function useHeldOrders(): Order[] {
  const openOrders = useOrderStore((state) => state.openOrders);
  return useMemo(
    () => openOrders.filter((order) => order.status === 'held').sort((a, b) => (b.heldAt ?? '').localeCompare(a.heldAt ?? '')),
    [openOrders],
  );
}

/** History, newest first. */
export function useOrderHistory(): Order[] {
  const completedOrders = useOrderStore((state) => state.completedOrders);
  return useMemo(() => [...completedOrders].sort(compareOrdersNewestFirst), [completedOrders]);
}

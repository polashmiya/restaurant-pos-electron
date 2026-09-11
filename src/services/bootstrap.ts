import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShiftStore } from '@/store/shiftStore';
import { useTableStore } from '@/store/tableStore';
import type { StoreSchema } from '@/types';
import { createEmptyDraft, orderToDraft } from '@/utils/orderHelpers';
import { markDraftSynced, syncDraftNow } from './draftSync';
import { runExclusive } from './persistQueue';
import { getStorage } from './storage';

/**
 * Loads persisted data into every store (master spec §73: load settings →
 * shift → tables → orders, then apply language/theme and open the POS).
 */
export function applyStoreData(data: StoreSchema): void {
  useSettingsStore.getState().hydrate(data.settings);
  useShiftStore.getState().hydrate(data.shifts);
  useTableStore.getState().hydrate(data.tables);
  useOrderStore.getState().hydrate(data.openOrders, data.completedOrders, data.orderCounter);
  useMenuStore.getState().hydrate(data.categories, data.menuItems);

  // Restore the order that was on the POS screen before the restart.
  const current = usePosStore.getState().draft;
  const sessionOrder = data.session.currentOrderId
    ? data.openOrders.find((order) => order.id === data.session.currentOrderId && order.status === 'draft')
    : undefined;
  const inMemory = data.openOrders.find((order) => order.id === current.id && order.status === 'draft');
  const restored = sessionOrder ?? inMemory;
  const draft = restored ? orderToDraft(restored) : createEmptyDraft(current.orderType);
  markDraftSynced(draft);
  usePosStore.getState().replaceDraft(draft);
}

export async function loadApplicationData(): Promise<void> {
  applyStoreData(await getStorage().getAll());
}

/** F5 — reloads everything from local storage without losing the current order. */
export function refreshApplicationData(): Promise<void> {
  return runExclusive(async () => {
    await syncDraftNow();
    applyStoreData(await getStorage().getAll());
  });
}

/** Applies data returned by a reset or an import (replaces everything). */
export function replaceApplicationData(data: StoreSchema): Promise<void> {
  return runExclusive(async () => {
    const draft = createEmptyDraft();
    markDraftSynced(draft);
    usePosStore.getState().replaceDraft(draft);
    applyStoreData(data);
  });
}

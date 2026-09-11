import { message } from '@/i18n/keys';
import { getAllOrderNumbers, useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTableStore } from '@/store/tableStore';
import { toast } from '@/store/uiStore';
import type { OrderDraft, StoreSchema } from '@/types';
import { logError } from '@/utils/errors';
import { draftToOrder, isDraftPersistable } from '@/utils/orderHelpers';
import { generateOrderNumber } from '@/utils/orderNumber';
import { runExclusive } from './persistQueue';
import { getStorage } from './storage';

/* ==========================================================================
   Automatic saving of the order being built on the POS.

   Every change to the working draft is written to `openOrders` (debounced),
   so an order in progress survives a restart, a crash or a language change.
   The order number is assigned the first time the draft is saved.
   ========================================================================== */

const SYNC_DELAY_MS = 250;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedDraft: OrderDraft | null = null;
let unsubscribe: (() => void) | null = null;

/** Records that `draft` is already persisted (skips a redundant save). */
export function markDraftSynced(draft: OrderDraft): void {
  lastSyncedDraft = draft;
}

export function cancelScheduledDraftSync(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

export function scheduleDraftSync(): void {
  cancelScheduledDraftSync();
  timer = setTimeout(() => {
    timer = null;
    runExclusive(syncDraftNow).catch((error: unknown) => {
      logError('draft-sync', error);
      toast.error(message('errors.saveFailed'));
    });
  }, SYNC_DELAY_MS);
}

/**
 * Persists the current draft immediately. Must run inside runExclusive()
 * (workflows call it first to flush pending edits).
 */
export async function syncDraftNow(): Promise<void> {
  cancelScheduledDraftSync();
  const draft = usePosStore.getState().draft;
  if (draft === lastSyncedDraft) return;

  const { openOrders, orderCounter } = useOrderStore.getState();
  const index = openOrders.findIndex((order) => order.id === draft.id);

  if (!isDraftPersistable(draft)) {
    if (index >= 0) {
      const nextOpen = openOrders.filter((order) => order.id !== draft.id);
      await getStorage().setMany({ openOrders: nextOpen, session: {} });
      useOrderStore.getState().setOpenOrders(nextOpen);
    }
    markDraftSynced(draft);
    return;
  }

  let orderNumber = draft.orderNumber;
  let counter = orderCounter;
  if (!orderNumber) {
    const generated = generateOrderNumber(orderCounter, getAllOrderNumbers(), new Date());
    orderNumber = generated.orderNumber;
    counter = generated.counter;
  }

  const settings = useSettingsStore.getState().settings;
  const table = draft.tableId ? useTableStore.getState().tables.find((entry) => entry.id === draft.tableId) : undefined;
  const snapshot = draftToOrder(draft, {
    orderNumber,
    status: 'draft',
    language: settings.language,
    taxRate: settings.defaultTaxRate,
    table,
  });
  const nextOpen = index >= 0 ? openOrders.map((order, i) => (i === index ? snapshot : order)) : [...openOrders, snapshot];

  const values: Partial<StoreSchema> = { openOrders: nextOpen, session: { currentOrderId: draft.id } };
  if (counter !== orderCounter) values.orderCounter = counter;
  await getStorage().setMany(values);

  useOrderStore.getState().setOpenOrders(nextOpen);
  if (counter !== orderCounter) useOrderStore.getState().setOrderCounter(counter);

  const current = usePosStore.getState().draft;
  if (current === draft) {
    const synced = draft.orderNumber ? draft : { ...draft, orderNumber };
    markDraftSynced(synced);
    if (synced !== draft) usePosStore.getState().replaceDraft(synced);
  } else if (current.id === draft.id && !current.orderNumber) {
    // The cashier kept editing while saving: keep their edits, add the number
    // and let the next scheduled save persist them.
    usePosStore.getState().replaceDraft({ ...current, orderNumber });
  }
}

/** Saves a pending change immediately when the window is closing. */
function flushOnUnload(): void {
  if (timer === null) return;
  cancelScheduledDraftSync();
  runExclusive(syncDraftNow).catch((error: unknown) => logError('draft-sync-unload', error));
}

/** Starts watching the POS draft. Returns a stop function. */
export function startDraftSync(): () => void {
  if (unsubscribe) return unsubscribe;
  const stop = usePosStore.subscribe((state, previous) => {
    if (state.draft === previous.draft || state.draft === lastSyncedDraft) return;
    scheduleDraftSync();
  });
  window.addEventListener('pagehide', flushOnUnload);
  unsubscribe = () => {
    stop();
    window.removeEventListener('pagehide', flushOnUnload);
    cancelScheduledDraftSync();
    unsubscribe = null;
  };
  return unsubscribe;
}

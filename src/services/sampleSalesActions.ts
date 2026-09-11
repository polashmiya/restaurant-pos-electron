import { APP_CONFIG } from '@/config/app.config';
import { message } from '@/i18n/keys';
import { useMenuStore } from '@/store/menuStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShiftStore } from '@/store/shiftStore';
import { useTableStore } from '@/store/tableStore';
import { confirmAction, toast } from '@/store/uiStore';
import { generateSampleSales } from '@/utils/sampleSales';
import { attempt } from './actionRunner';
import { runExclusive } from './persistQueue';
import { getStorage } from './storage';

/* ==========================================================================
   Developer tools: load / remove demo sales so Reports can be explored.
   Sample records carry `sample: true`; real orders and shifts are never
   touched. Both actions ask for confirmation and persist before committing.
   ========================================================================== */

/**
 * Drops existing sample orders/shifts, optionally generates a fresh set,
 * saves, then updates the stores. Resolves to the number of sample orders added.
 */
function replaceSampleData(generate: boolean): Promise<number> {
  return runExclusive(async () => {
    const { openOrders, completedOrders, orderCounter } = useOrderStore.getState();
    const { shifts } = useShiftStore.getState();
    const { settings } = useSettingsStore.getState();
    const realOrders = completedOrders.filter((order) => !order.sample);
    const realShifts = shifts.filter((shift) => !shift.sample);

    const sample = generate
      ? generateSampleSales({
          menuItems: useMenuStore.getState().items,
          tables: useTableStore.getState().tables,
          taxRate: settings.defaultTaxRate,
          language: settings.language,
          existingOrderNumbers: new Set([...openOrders, ...realOrders].map((order) => order.orderNumber)),
          now: new Date(),
          days: APP_CONFIG.reports.sampleDays,
          seed: Date.now() % 1_000_000,
        })
      : { orders: [], shifts: [] };

    const nextOrders = [...realOrders, ...sample.orders];
    const nextShifts = [...realShifts, ...sample.shifts];
    await getStorage().setMany({ completedOrders: nextOrders, shifts: nextShifts });
    useOrderStore.getState().hydrate(openOrders, nextOrders, orderCounter);
    useShiftStore.getState().setShifts(nextShifts);
    return sample.orders.length;
  });
}

export async function loadSampleSales(): Promise<boolean> {
  if (!useMenuStore.getState().items.some((item) => item.isAvailable && item.price > 0)) {
    toast.warning(message('settings.about.sampleNoMenu'));
    return false;
  }
  const confirmed = await confirmAction({
    title: message('settings.about.sampleTitle'),
    message: message('settings.about.sampleMessage', { days: APP_CONFIG.reports.sampleDays }),
    confirmLabel: message('settings.about.sampleConfirm'),
    tone: 'primary',
  });
  if (!confirmed) return false;

  let added = 0;
  const ok = await attempt('sample-sales-load', async () => {
    added = await replaceSampleData(true);
  });
  if (ok) toast.success(message('settings.about.sampleLoaded', { count: added }), APP_CONFIG.ui.longToastDurationMs);
  return ok;
}

export async function removeSampleSales(): Promise<boolean> {
  const count = useOrderStore.getState().completedOrders.filter((order) => order.sample).length;
  if (count === 0) return false;
  const confirmed = await confirmAction({
    title: message('settings.about.sampleRemoveTitle'),
    message: message('settings.about.sampleRemoveMessage', { count }),
    confirmLabel: message('settings.about.sampleRemoveConfirm'),
    tone: 'danger',
  });
  if (!confirmed) return false;

  const ok = await attempt('sample-sales-remove', () => replaceSampleData(false));
  if (ok) toast.success(message('settings.about.sampleRemoved'));
  return ok;
}

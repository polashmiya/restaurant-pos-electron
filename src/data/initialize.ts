import { APP_CONFIG } from '@/config/app.config';
import type {
  AppMeta,
  Category,
  DiningTable,
  MenuItem,
  Order,
  OrderCounter,
  PosSession,
  Shift,
  StoreKey,
  StoreSchema,
} from '@/types';
import { computeShiftTotals, shiftTotalsEqual } from '@/utils/shiftMath';
import { createDefaultSettings, mergeWithDefaultSettings } from './defaults';
import { createSeedCategories, createSeedMenuItems, createSeedTables, getSeedImageFor } from './seed';
import { isPlainObject } from './storeKeys';
import { isOrderCounter } from './validators';

/** Values exactly as read from disk — nothing is trusted yet. */
export type RawStoreData = Partial<Record<StoreKey, unknown>>;

export interface PreparedStoreData {
  /** Complete, consistent data set to load into the application. */
  data: StoreSchema;
  /** Only the collections that must be written back to disk. */
  changes: Partial<StoreSchema>;
  /** True when demo data was created because none existed. */
  seeded: boolean;
  /** Human readable descriptions of any automatic repairs (for logs). */
  repairs: string[];
}

/**
 * Schema migrations keyed by the version they upgrade TO. A migration never
 * mutates: it returns a new value for every collection it changes, which is
 * how changed collections are detected and written back to disk.
 */
const MIGRATIONS: Record<number, (data: RawStoreData) => RawStoreData> = {
  // v2 — the original demo menu items get the bundled photos. Items the user
  // gave an image, re-coded or added themselves are left untouched.
  2: (data) => {
    if (!Array.isArray(data.menuItems)) return data;
    let changed = false;
    const menuItems = data.menuItems.map((item: unknown) => {
      if (!isPlainObject(item) || item.image !== undefined || typeof item.id !== 'string' || typeof item.code !== 'string') {
        return item;
      }
      const image = getSeedImageFor({ id: item.id, code: item.code });
      if (!image) return item;
      changed = true;
      return { ...item, image };
    });
    return changed ? { ...data, menuItems } : data;
  },
};

interface MigrationResult {
  data: RawStoreData;
  /** Collections a migration rewrote — they must be saved. */
  changed: StoreKey[];
}

export function runMigrations(raw: RawStoreData, fromVersion: number): MigrationResult {
  let data = raw;
  for (let version = fromVersion + 1; version <= APP_CONFIG.storageSchemaVersion; version += 1) {
    const migrate = MIGRATIONS[version];
    if (migrate) data = migrate(data);
  }
  const changed = (Object.keys(data) as StoreKey[]).filter((key) => data[key] !== raw[key]);
  return { data, changed };
}

interface CollectionResult<T> {
  value: T[];
  changed: boolean;
}

function readCollection<T>(value: unknown, key: StoreKey, fallback: () => T[], repairs: string[]): CollectionResult<T> {
  if (value === undefined) return { value: fallback(), changed: true };
  if (!Array.isArray(value)) {
    repairs.push(`${key} was not a list and has been reset`);
    return { value: fallback(), changed: true };
  }
  const records = value.filter(isPlainObject);
  if (records.length !== value.length) {
    repairs.push(`${key}: removed ${value.length - records.length} malformed record(s)`);
    return { value: records as T[], changed: true };
  }
  return { value: value as T[], changed: false };
}

function releaseTable(table: DiningTable, nowIso: string): DiningTable {
  const { activeOrderId: _released, ...rest } = table;
  return { ...rest, status: table.reservation ? 'reserved' : 'available', statusSince: nowIso };
}

/**
 * initializeStore() core logic (master spec §47), shared by the Electron main
 * process and the browser fallback:
 *
 * 1. Check whether data exists.
 * 2. Create missing collections.
 * 3. Seed demo data only when a collection has never existed.
 * 4. Preserve existing data (never overwritten during a normal start).
 * 5. Repair inconsistencies left by an interrupted operation.
 */
export function prepareStoreData(raw: RawStoreData, now: Date = new Date()): PreparedStoreData {
  const nowIso = now.toISOString();
  const changes: Partial<StoreSchema> = {};
  const repairs: string[] = [];

  const storedMeta = isPlainObject(raw.meta) ? (raw.meta as Partial<AppMeta>) : undefined;
  const fromVersion =
    typeof storedMeta?.schemaVersion === 'number' ? storedMeta.schemaVersion : APP_CONFIG.storageSchemaVersion;
  const { data: source, changed: migrated } = runMigrations(raw, fromVersion);

  // Settings — fill in defaults for any option missing from stored data.
  const settings = source.settings === undefined ? createDefaultSettings() : mergeWithDefaultSettings(source.settings);
  if (JSON.stringify(settings) !== JSON.stringify(source.settings)) changes.settings = settings;

  // Catalog — seeded only if it never existed (an empty list is respected).
  let seeded = false;
  const categories = readCollection<Category>(source.categories, 'categories', createSeedCategories, repairs);
  if (categories.changed) changes.categories = categories.value;
  if (source.categories === undefined) seeded = true;

  const menuItems = readCollection<MenuItem>(source.menuItems, 'menuItems', createSeedMenuItems, repairs);
  if (menuItems.changed) changes.menuItems = menuItems.value;
  if (source.menuItems === undefined) seeded = true;

  const tablesResult = readCollection<DiningTable>(source.tables, 'tables', createSeedTables, repairs);
  if (tablesResult.changed) changes.tables = tablesResult.value;
  if (source.tables === undefined) seeded = true;

  const completed = readCollection<Order>(source.completedOrders, 'completedOrders', () => [], repairs);
  if (completed.changed) changes.completedOrders = completed.value;
  const completedOrders = completed.value;

  const open = readCollection<Order>(source.openOrders, 'openOrders', () => [], repairs);
  let openOrders = open.value;
  let openOrdersChanged = open.changed;

  const shiftsResult = readCollection<Shift>(source.shifts, 'shifts', () => [], repairs);
  let shifts = shiftsResult.value;
  let shiftsChanged = shiftsResult.changed;

  // 1. Orders that reached history but are still listed as open (a completion
  //    was interrupted after the order had been saved).
  const historyIds = new Set(completedOrders.map((order) => order.id));
  const stillOpen = openOrders.filter(
    (order) => !historyIds.has(order.id) && (order.status === 'draft' || order.status === 'held'),
  );
  if (stillOpen.length !== openOrders.length) {
    repairs.push(`removed ${openOrders.length - stillOpen.length} open order(s) that were already completed`);
    openOrders = stillOpen;
    openOrdersChanged = true;
  }

  // 2. Tables and their active orders must point at each other.
  const openById = new Map(openOrders.map((order) => [order.id, order]));
  const claimedBy = new Map<string, string>();
  let tablesChanged = tablesResult.changed;
  const tables = tablesResult.value.map((table) => {
    const order = table.activeOrderId ? openById.get(table.activeOrderId) : undefined;
    if (table.activeOrderId && (!order || order.tableId !== table.id)) {
      repairs.push(`released table ${table.name} (its order no longer exists)`);
      tablesChanged = true;
      return releaseTable(table, nowIso);
    }
    if (!table.activeOrderId && (table.status === 'occupied' || table.status === 'waiting')) {
      repairs.push(`released table ${table.name} (no active order)`);
      tablesChanged = true;
      return releaseTable(table, nowIso);
    }
    if (order) claimedBy.set(table.id, order.id);
    return table;
  });

  for (const order of openOrders) {
    if (order.orderType !== 'dine-in' || !order.tableId || claimedBy.get(order.tableId) === order.id) continue;
    const index = tables.findIndex((table) => table.id === order.tableId);
    const table = index >= 0 ? tables[index] : undefined;
    if (table && !table.activeOrderId && !claimedBy.has(table.id)) {
      const { reservation: _cleared, ...rest } = table;
      tables[index] = { ...rest, status: 'occupied', activeOrderId: order.id, statusSince: order.createdAt };
      claimedBy.set(table.id, order.id);
      tablesChanged = true;
      repairs.push(`re-linked table ${table.name} to order ${order.orderNumber}`);
    } else {
      openOrders = openOrders.map((entry) => {
        if (entry.id !== order.id) return entry;
        const { tableId: _tableId, tableName: _tableName, ...rest } = entry;
        return rest;
      });
      openOrdersChanged = true;
      repairs.push(`detached order ${order.orderNumber} from an unavailable table`);
    }
  }

  // 3. At most one open shift, with totals derived from its orders.
  const openShifts = shifts.filter((shift) => shift.status === 'open');
  if (openShifts.length > 1) {
    const latest = openShifts.reduce((a, b) => (a.openedAt >= b.openedAt ? a : b));
    shifts = shifts.map((shift) =>
      shift.status === 'open' && shift.id !== latest.id ? { ...shift, status: 'closed', closedAt: nowIso } : shift,
    );
    shiftsChanged = true;
    repairs.push(`closed ${openShifts.length - 1} extra open shift(s)`);
  }
  const currentShift = shifts.find((shift) => shift.status === 'open');
  if (currentShift) {
    const totals = computeShiftTotals(completedOrders, currentShift.id);
    if (!shiftTotalsEqual(currentShift, totals)) {
      shifts = shifts.map((shift) => (shift.id === currentShift.id ? { ...shift, ...totals } : shift));
      shiftsChanged = true;
      repairs.push('recalculated current shift totals from its orders');
    }
  }

  // 4. Order-number counter.
  let orderCounter: OrderCounter;
  if (isOrderCounter(source.orderCounter)) {
    orderCounter = source.orderCounter;
  } else {
    orderCounter = { date: '', sequence: 0 };
    changes.orderCounter = orderCounter;
  }

  // 5. The POS session may only point at an existing open order.
  const storedSession = isPlainObject(source.session) ? (source.session as PosSession) : undefined;
  let session: PosSession = storedSession ?? {};
  if (session.currentOrderId && !openOrders.some((order) => order.id === session.currentOrderId)) {
    session = {};
    changes.session = session;
  } else if (!storedSession) {
    changes.session = session;
  }

  if (openOrdersChanged) changes.openOrders = openOrders;
  if (tablesChanged) changes.tables = tables;
  if (shiftsChanged) changes.shifts = shifts;

  const meta: AppMeta = {
    schemaVersion: APP_CONFIG.storageSchemaVersion,
    ...(storedMeta?.seededAt ? { seededAt: storedMeta.seededAt } : seeded ? { seededAt: nowIso } : {}),
    lastStartedAt: nowIso,
  };
  changes.meta = meta;

  const data: StoreSchema = {
    meta,
    settings,
    categories: categories.value,
    menuItems: menuItems.value,
    tables,
    openOrders,
    completedOrders,
    shifts,
    orderCounter,
    session,
  };

  // Collections rewritten by a schema migration are saved in their final form.
  for (const key of migrated) {
    if (key in data && changes[key] === undefined) Object.assign(changes, { [key]: data[key] });
  }

  return { data, changes, seeded, repairs };
}

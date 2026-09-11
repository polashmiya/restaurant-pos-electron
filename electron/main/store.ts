import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import { prepareStoreData, type RawStoreData } from '@/data/initialize';
import { STORE_KEYS } from '@/data/storeKeys';
import type { AppendableItem, AppendableStoreKey, Order, StoreKey, StoreSchema } from '@/types';
import { logger } from './logger';

/* ==========================================================================
   electron-store persistence (master spec §46, §47)

   Collections are split across files by how often they change, so a cart
   update never rewrites the menu and a payment never rewrites settings:

     pos-settings.json    meta, settings
     pos-catalog.json     categories, menuItems
     pos-operations.json  tables, openOrders, shifts, orderCounter, session
     orders/pos-orders-YYYY-MM.json   completed + cancelled orders (monthly)

   electron-store writes atomically (temp file + rename), so a crash during a
   write never corrupts existing data.
   ========================================================================== */

type RecordStore = Store<Record<string, unknown>>;
type FileGroup = 'settings' | 'catalog' | 'operations';
type GroupedKey = Exclude<StoreKey, 'completedOrders'>;

const KEY_GROUP: Record<GroupedKey, FileGroup> = {
  meta: 'settings',
  settings: 'settings',
  categories: 'catalog',
  menuItems: 'catalog',
  tables: 'operations',
  openOrders: 'operations',
  shifts: 'operations',
  orderCounter: 'operations',
  session: 'operations',
};

const FILE_PREFIX = 'pos-';
const ORDERS_DIRECTORY = 'orders';
const ORDERS_FILE_PATTERN = /^pos-orders-(\d{4}-\d{2})\.json$/;
const ORDERS_RECORD_KEY = 'orders';

const groupStores = new Map<FileGroup, RecordStore>();
const monthStores = new Map<string, RecordStore>();

function ordersDirectory(): string {
  return path.join(app.getPath('userData'), ORDERS_DIRECTORY);
}

function timestampSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/** Moves an unreadable store file aside so it can be recovered manually. */
function quarantineCorruptFile(filePath: string, error: unknown): void {
  const target = filePath.replace(/\.json$/, `.corrupt-${timestampSuffix()}.json`);
  try {
    if (fs.existsSync(filePath)) fs.renameSync(filePath, target);
    logger.error(`Store file ${filePath} could not be read and was moved to ${target}`, error);
  } catch (renameError) {
    logger.error(`Store file ${filePath} could not be read or moved`, renameError);
  }
}

function openStoreFile(name: string, cwd: string, compact: boolean): RecordStore {
  const options = {
    name,
    cwd,
    clearInvalidConfig: false,
    watch: false,
    accessPropertiesByDotNotation: false,
    serialize: compact
      ? (value: Record<string, unknown>) => JSON.stringify(value)
      : (value: Record<string, unknown>) => JSON.stringify(value, null, 2),
  };
  try {
    return new Store<Record<string, unknown>>(options);
  } catch (error) {
    quarantineCorruptFile(path.join(cwd, `${name}.json`), error);
    return new Store<Record<string, unknown>>(options);
  }
}

function groupStore(group: FileGroup): RecordStore {
  let store = groupStores.get(group);
  if (!store) {
    store = openStoreFile(`${FILE_PREFIX}${group}`, app.getPath('userData'), false);
    groupStores.set(group, store);
  }
  return store;
}

function monthStore(month: string): RecordStore {
  let store = monthStores.get(month);
  if (!store) {
    store = openStoreFile(`${FILE_PREFIX}orders-${month}`, ordersDirectory(), true);
    monthStores.set(month, store);
  }
  return store;
}

/** Local YYYY-MM of the moment an order left the open list. */
function orderMonth(order: Order): string {
  const stamp = order.completedAt ?? order.cancelledAt ?? order.createdAt;
  const date = new Date(stamp);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}`;
}

function listOrderMonths(): string[] {
  const directory = ordersDirectory();
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .map((file) => ORDERS_FILE_PATTERN.exec(file)?.[1])
    .filter((month): month is string => Boolean(month))
    .sort();
}

function readMonthOrders(month: string): Order[] {
  const value = monthStore(month).get(ORDERS_RECORD_KEY);
  return Array.isArray(value) ? (value as Order[]) : [];
}

function readCompletedOrders(): Order[] | undefined {
  if (!fs.existsSync(ordersDirectory())) return undefined;
  return listOrderMonths().flatMap(readMonthOrders);
}

function writeCompletedOrders(orders: readonly Order[]): void {
  fs.mkdirSync(ordersDirectory(), { recursive: true });
  const byMonth = new Map<string, Order[]>();
  for (const order of orders) {
    const month = orderMonth(order);
    const list = byMonth.get(month) ?? [];
    list.push(order);
    byMonth.set(month, list);
  }
  for (const month of listOrderMonths()) {
    if (!byMonth.has(month)) monthStore(month).set(ORDERS_RECORD_KEY, []);
  }
  for (const [month, list] of byMonth) {
    monthStore(month).set(ORDERS_RECORD_KEY, list);
  }
}

function deleteCompletedOrders(): void {
  monthStores.clear();
  fs.rmSync(ordersDirectory(), { recursive: true, force: true });
}

/* ------------------------------ Public API -------------------------------- */

export function getValue<K extends StoreKey>(key: K): StoreSchema[K] | undefined {
  if (key === 'completedOrders') return readCompletedOrders() as StoreSchema[K] | undefined;
  return groupStore(KEY_GROUP[key as GroupedKey]).get(key) as StoreSchema[K] | undefined;
}

export function setValue<K extends StoreKey>(key: K, value: StoreSchema[K]): void {
  if (key === 'completedOrders') {
    writeCompletedOrders(value as Order[]);
    return;
  }
  groupStore(KEY_GROUP[key as GroupedKey]).set(key, value);
}

export function deleteValue(key: StoreKey): void {
  if (key === 'completedOrders') {
    deleteCompletedOrders();
    return;
  }
  groupStore(KEY_GROUP[key]).delete(key);
}

/**
 * Writes several collections. Order history is written first (durability),
 * then each file group in a single atomic write.
 */
export function setMany(values: Partial<StoreSchema>): void {
  if (values.completedOrders) writeCompletedOrders(values.completedOrders);

  const grouped = new Map<FileGroup, Record<string, unknown>>();
  for (const key of STORE_KEYS) {
    if (key === 'completedOrders' || !(key in values)) continue;
    const group = KEY_GROUP[key];
    const entries = grouped.get(group) ?? {};
    entries[key] = values[key];
    grouped.set(group, entries);
  }
  for (const [group, entries] of grouped) {
    groupStore(group).set(entries);
  }
}

/** Appends one record without the renderer resending the whole collection. */
export function appendValue<K extends AppendableStoreKey>(key: K, item: AppendableItem<K>): void {
  if (key === 'completedOrders') {
    const order = item as Order;
    fs.mkdirSync(ordersDirectory(), { recursive: true });
    const month = orderMonth(order);
    const existing = readMonthOrders(month);
    if (existing.some((entry) => entry.id === order.id)) {
      throw new Error(`Order ${order.orderNumber} is already saved`);
    }
    monthStore(month).set(ORDERS_RECORD_KEY, [...existing, order]);
    return;
  }
  const store = groupStore(KEY_GROUP[key as GroupedKey]);
  const current = store.get(key);
  store.set(key, [...(Array.isArray(current) ? current : []), item]);
}

export function getAll(): StoreSchema {
  const entries = STORE_KEYS.map((key) => [key, getValue(key)] as const);
  return Object.fromEntries(entries) as unknown as StoreSchema;
}

/** Removes every collection (used before a reset or an import). */
export function clearAll(): void {
  for (const group of ['settings', 'catalog', 'operations'] as const) {
    groupStore(group).clear();
  }
  deleteCompletedOrders();
}

/**
 * initializeStore() — runs on every start before the renderer loads:
 * creates missing collections, seeds demo data only when nothing exists,
 * keeps all existing data and repairs interrupted operations.
 */
export function initializeStore(): StoreSchema {
  const raw: RawStoreData = {};
  for (const key of STORE_KEYS) raw[key] = getValue(key);

  const prepared = prepareStoreData(raw, new Date());
  if (Object.keys(prepared.changes).length > 0) setMany(prepared.changes);

  if (prepared.seeded) logger.info('No existing data found — demo data created.');
  for (const repair of prepared.repairs) logger.warn(`Data repair: ${repair}`);
  logger.info(`Store ready at ${app.getPath('userData')}`);
  return prepared.data;
}

/** Replaces all data with a complete, consistent data set. */
export function replaceAllData(source: RawStoreData): StoreSchema {
  const prepared = prepareStoreData(source, new Date());
  clearAll();
  setMany(prepared.data);
  return prepared.data;
}

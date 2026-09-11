import type { AppendableStoreKey, StoreKey } from '@/types';

/** Every persisted collection. Shared by the main process and renderer. */
export const STORE_KEYS = [
  'meta',
  'settings',
  'categories',
  'menuItems',
  'tables',
  'openOrders',
  'completedOrders',
  'shifts',
  'orderCounter',
  'session',
] as const satisfies readonly StoreKey[];

// Compile-time guarantee that STORE_KEYS lists every key of StoreSchema.
type MissingStoreKeys = Exclude<StoreKey, (typeof STORE_KEYS)[number]>;
const assertAllKeysListed: MissingStoreKeys extends never ? true : never = true;
void assertAllKeysListed;

export const APPENDABLE_STORE_KEYS = ['completedOrders', 'shifts'] as const satisfies readonly AppendableStoreKey[];

/** Whether a collection is stored as an array or a single object. */
export const STORE_KEY_KIND: Record<StoreKey, 'array' | 'object'> = {
  meta: 'object',
  settings: 'object',
  categories: 'array',
  menuItems: 'array',
  tables: 'array',
  openOrders: 'array',
  completedOrders: 'array',
  shifts: 'array',
  orderCounter: 'object',
  session: 'object',
};

export function isStoreKey(value: unknown): value is StoreKey {
  return typeof value === 'string' && (STORE_KEYS as readonly string[]).includes(value);
}

export function isAppendableStoreKey(value: unknown): value is AppendableStoreKey {
  return typeof value === 'string' && (APPENDABLE_STORE_KEYS as readonly string[]).includes(value);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Shallow shape check used to reject malformed writes over IPC. */
export function isValidStoreValue(key: StoreKey, value: unknown): boolean {
  if (STORE_KEY_KIND[key] === 'array') {
    return Array.isArray(value) && value.every(isPlainObject);
  }
  return isPlainObject(value);
}

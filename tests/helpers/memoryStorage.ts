import { prepareStoreData, type RawStoreData } from '@/data/initialize';
import { STORE_KEYS } from '@/data/storeKeys';
import type { StorageAdapter } from '@/services/storage';
import type { StoreSchema } from '@/types';
import { AppError } from '@/utils/errors';

export type StorageOperation = 'set' | 'setMany' | 'append' | 'delete' | 'reset' | 'getAll';

export interface MemoryStorage extends StorageAdapter {
  /** Current persisted data (what "disk" holds). */
  readonly data: StoreSchema;
  /** Makes the given operation fail until disabled (simulates disk errors). */
  failOn: (operation: StorageOperation, enabled?: boolean) => void;
  calls: { operation: StorageOperation; keys: string[] }[];
}

const clone = <T>(value: T): T => structuredClone(value);

/** In-memory StorageAdapter with the same semantics as electron-store. */
export function createMemoryStorage(initial: RawStoreData = {}): MemoryStorage {
  let data = prepareStoreData(initial, new Date('2026-09-10T08:00:00Z')).data;
  const failing = new Set<StorageOperation>();
  const calls: MemoryStorage['calls'] = [];

  const guard = (operation: StorageOperation, keys: string[]) => {
    calls.push({ operation, keys });
    if (failing.has(operation)) {
      throw new AppError('storage', 'errors.dataSaveFailed', { detail: `${operation} failed (simulated)` });
    }
  };

  return {
    kind: 'memory',
    get data() {
      return data;
    },
    calls,
    failOn(operation, enabled = true) {
      if (enabled) failing.add(operation);
      else failing.delete(operation);
    },
    async getAll() {
      guard('getAll', []);
      return clone(data);
    },
    async get(key) {
      return clone(data[key]);
    },
    async set(key, value) {
      guard('set', [key]);
      data = { ...data, [key]: clone(value) };
    },
    async setMany(values) {
      guard('setMany', Object.keys(values));
      const next = { ...data };
      for (const key of STORE_KEYS) {
        if (key in values) Object.assign(next, { [key]: clone(values[key]) });
      }
      data = next;
    },
    async append(key, item) {
      guard('append', [key]);
      const list = data[key] as { id: string }[];
      if (list.some((entry) => entry.id === item.id)) throw new Error('duplicate');
      data = { ...data, [key]: [...list, clone(item)] };
    },
    async delete(key) {
      guard('delete', [key]);
      const next = { ...data } as Partial<StoreSchema>;
      delete next[key];
      data = next as StoreSchema;
    },
    async reset() {
      guard('reset', []);
      data = prepareStoreData({}, new Date()).data;
      return clone(data);
    },
  };
}

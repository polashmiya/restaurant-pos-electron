import { prepareStoreData, type RawStoreData } from '@/data/initialize';
import { STORE_KEYS } from '@/data/storeKeys';
import type { AppendableItem, AppendableStoreKey, StoreKey, StoreSchema } from '@/types';
import { AppError } from '@/utils/errors';
import type { ElectronStoreAPI } from '../../electron/types/electron';

/* ==========================================================================
   Renderer persistence gateway.

   - In the desktop app every call goes through window.electronAPI.store
     (IPC → electron-store in the main process).
   - When the UI is opened in a plain browser (Vite preview / tests), a
     localStorage adapter with identical behaviour is used instead.

   Stores never touch storage directly; they go through `getStorage()`.
   Every failure is wrapped in an AppError('storage') so callers can show a
   friendly, localized message and keep their in-memory state unchanged.
   ========================================================================== */

export interface StorageAdapter {
  readonly kind: 'electron' | 'browser' | 'memory';
  getAll(): Promise<StoreSchema>;
  get<K extends StoreKey>(key: K): Promise<StoreSchema[K] | undefined>;
  set<K extends StoreKey>(key: K, value: StoreSchema[K]): Promise<void>;
  setMany(values: Partial<StoreSchema>): Promise<void>;
  append<K extends AppendableStoreKey>(key: K, item: AppendableItem<K>): Promise<void>;
  delete(key: StoreKey): Promise<void>;
  reset(): Promise<StoreSchema>;
}

function wrap<T>(operation: string, action: () => Promise<T>): Promise<T> {
  return action().catch((error: unknown) => {
    throw new AppError('storage', 'errors.dataSaveFailed', { cause: error, detail: `Storage ${operation} failed` });
  });
}

export function createElectronStorage(api: ElectronStoreAPI): StorageAdapter {
  return {
    kind: 'electron',
    getAll: () => wrap('getAll', () => api.getAll()),
    get: (key) => wrap('get', () => api.get(key)),
    set: (key, value) => wrap('set', () => api.set(key, value)),
    setMany: (values) => wrap('setMany', () => api.setMany(values)),
    append: (key, item) => wrap('append', () => api.append(key, item)),
    delete: (key) => wrap('delete', () => api.delete(key)),
    reset: () => wrap('reset', () => api.reset()),
  };
}

const BROWSER_KEY_PREFIX = 'restaurant-pos:';

/** localStorage-backed adapter used when the UI runs outside Electron. */
export function createBrowserStorage(backend: Storage): StorageAdapter {
  let initialized = false;

  const read = (key: StoreKey): unknown => {
    const raw = backend.getItem(BROWSER_KEY_PREFIX + key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  };
  const write = (key: StoreKey, value: unknown): void => {
    backend.setItem(BROWSER_KEY_PREFIX + key, JSON.stringify(value));
  };
  const writeMany = (values: Partial<StoreSchema>): void => {
    for (const key of STORE_KEYS) {
      if (key in values) write(key, values[key]);
    }
  };
  const readAll = (): StoreSchema =>
    Object.fromEntries(STORE_KEYS.map((key) => [key, read(key)])) as unknown as StoreSchema;

  const ensureInitialized = (): void => {
    if (initialized) return;
    const raw: RawStoreData = {};
    for (const key of STORE_KEYS) raw[key] = read(key);
    const prepared = prepareStoreData(raw, new Date());
    writeMany(prepared.changes);
    initialized = true;
  };

  const run = <T>(operation: string, action: () => T): Promise<T> =>
    wrap(operation, async () => {
      ensureInitialized();
      return action();
    });

  return {
    kind: 'browser',
    getAll: () => run('getAll', readAll),
    get: (key) => run('get', () => read(key) as StoreSchema[typeof key] | undefined),
    set: (key, value) => run('set', () => write(key, value)),
    setMany: (values) => run('setMany', () => writeMany(values)),
    append: (key, item) =>
      run('append', () => {
        const current = read(key);
        const list = Array.isArray(current) ? current : [];
        if (list.some((entry: { id?: string }) => entry.id === item.id)) {
          throw new Error(`Record ${item.id} already exists in ${key}`);
        }
        write(key, [...list, item]);
      }),
    delete: (key) => run('delete', () => backend.removeItem(BROWSER_KEY_PREFIX + key)),
    reset: () =>
      wrap('reset', async () => {
        for (const key of STORE_KEYS) backend.removeItem(BROWSER_KEY_PREFIX + key);
        const prepared = prepareStoreData({}, new Date());
        writeMany(prepared.data);
        initialized = true;
        return prepared.data;
      }),
  };
}

let activeAdapter: StorageAdapter | null = null;

/** Returns the storage adapter for the current runtime (desktop or browser). */
export function getStorage(): StorageAdapter {
  if (!activeAdapter) {
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    activeAdapter = api ? createElectronStorage(api.store) : createBrowserStorage(window.localStorage);
  }
  return activeAdapter;
}

/** Replaces the adapter (used by tests). */
export function setStorageAdapter(adapter: StorageAdapter | null): void {
  activeAdapter = adapter;
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
}

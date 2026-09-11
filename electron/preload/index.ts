import { contextBridge, ipcRenderer } from 'electron';
import type { AppendableItem, AppendableStoreKey, StoreKey, StoreSchema } from '../../src/types';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { ElectronAPI } from '../types/electron';

/* ==========================================================================
   Preload (sandboxed). Exposes a small, typed, frozen API on
   window.electronAPI. The renderer never receives ipcRenderer, Node's
   `process`, `require`, the filesystem or any Electron module.
   ========================================================================== */

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const api: ElectronAPI = {
  store: {
    get: <K extends StoreKey>(key: K) => invoke<StoreSchema[K] | undefined>(IPC_CHANNELS.store.get, key),
    set: <K extends StoreKey>(key: K, value: StoreSchema[K]) => invoke<void>(IPC_CHANNELS.store.set, key, value),
    delete: (key) => invoke<void>(IPC_CHANNELS.store.delete, key),
    setMany: (values) => invoke<void>(IPC_CHANNELS.store.setMany, values),
    append: <K extends AppendableStoreKey>(key: K, item: AppendableItem<K>) =>
      invoke<void>(IPC_CHANNELS.store.append, key, item),
    getAll: () => invoke(IPC_CHANNELS.store.getAll),
    reset: () => invoke(IPC_CHANNELS.store.reset),
  },
  print: {
    receipt: (html, options) => invoke(IPC_CHANNELS.print.receipt, html, options),
    kot: (html, options) => invoke(IPC_CHANNELS.print.kot, html, options),
    savePdf: (html, options) => invoke(IPC_CHANNELS.print.savePdf, html, options),
    getPrinters: () => invoke(IPC_CHANNELS.print.getPrinters),
  },
  data: {
    exportBackup: () => invoke(IPC_CHANNELS.data.export),
    pickImport: () => invoke(IPC_CHANNELS.data.pickImport),
    applyImport: (token) => invoke(IPC_CHANNELS.data.applyImport, token),
    saveCsv: (fileName, content) => invoke(IPC_CHANNELS.data.saveCsv, fileName, content),
  },
  app: {
    getVersion: () => invoke(IPC_CHANNELS.app.getVersion),
    getInfo: () => invoke(IPC_CHANNELS.app.getInfo),
    setNativeTheme: (theme) => invoke<void>(IPC_CHANNELS.app.setNativeTheme, theme),
    openDataFolder: () => invoke<void>(IPC_CHANNELS.app.openDataFolder),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

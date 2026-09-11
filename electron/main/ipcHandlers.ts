import { app, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { APP_CONFIG, PAPER_WIDTHS } from '@/config/app.config';
import { isAppendableStoreKey, isPlainObject, isStoreKey, isValidStoreValue, STORE_KEYS } from '@/data/storeKeys';
import { isOrder, isShift } from '@/data/validators';
import type { PaperWidth, StoreKey, StoreSchema, Theme } from '@/types';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { AppInfo, PrintJobOptions, SavePdfOptions } from '../types/electron';
import { applyImport, exportBackup, pickImport, resetToDemoData, saveCsvFile } from './dataTransfer';
import { logger } from './logger';
import { getPrinters, printDocument, savePdf } from './printManager';
import { assertTrustedSender } from './security';
import { appendValue, deleteValue, getAll, getValue, setMany, setValue } from './store';
import { applyNativeTheme } from './windowManager';

/* ==========================================================================
   IPC handlers (master spec §67). Every handler:
   1. verifies the call comes from the application's own page,
   2. validates every argument (the renderer is never trusted),
   3. logs failures and rethrows a plain Error (no stack/secrets leak).
   ========================================================================== */

type Handler = (...args: unknown[]) => unknown;

function handle(channel: string, handler: Handler): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    assertTrustedSender(event);
    try {
      return await handler(...args);
    } catch (error) {
      logger.error(`IPC ${channel} failed`, error);
      throw new Error(error instanceof Error ? error.message : 'Operation failed', { cause: error });
    }
  });
}

function requireStoreKey(value: unknown): StoreKey {
  if (!isStoreKey(value)) throw new Error('Unknown store key');
  return value;
}

function requireTheme(value: unknown): Theme {
  if (value === 'dark' || value === 'light' || value === 'system') return value;
  throw new Error('Invalid theme');
}

function requirePaperWidth(value: unknown): PaperWidth {
  if (typeof value === 'string' && (PAPER_WIDTHS as readonly string[]).includes(value)) return value as PaperWidth;
  throw new Error('Invalid paper width');
}

function requireString(value: unknown, label: string, maxLength: number = APP_CONFIG.ipcLimits.text): string {
  if (typeof value !== 'string' || value.length > maxLength) throw new Error(`Invalid ${label}`);
  return value;
}

function requirePrintJobOptions(value: unknown): PrintJobOptions {
  if (!isPlainObject(value)) throw new Error('Invalid print options');
  return {
    printerName: requireString(value.printerName, 'printer name'),
    paperWidth: requirePaperWidth(value.paperWidth),
    copies: typeof value.copies === 'number' && Number.isFinite(value.copies) ? value.copies : 1,
    title: requireString(value.title, 'title', APP_CONFIG.ipcLimits.title),
  };
}

function requireSavePdfOptions(value: unknown): SavePdfOptions {
  if (!isPlainObject(value)) throw new Error('Invalid PDF options');
  return {
    paperWidth: requirePaperWidth(value.paperWidth),
    fileName: requireString(value.fileName, 'file name', APP_CONFIG.ipcLimits.fileName),
  };
}

function requireHtml(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid print document');
  return value;
}

function registerStoreHandlers(): void {
  handle(IPC_CHANNELS.store.get, (key) => getValue(requireStoreKey(key)));

  handle(IPC_CHANNELS.store.set, (key, value) => {
    const storeKey = requireStoreKey(key);
    if (!isValidStoreValue(storeKey, value)) throw new Error(`Invalid value for ${storeKey}`);
    setValue(storeKey, value as StoreSchema[typeof storeKey]);
  });

  handle(IPC_CHANNELS.store.delete, (key) => deleteValue(requireStoreKey(key)));

  handle(IPC_CHANNELS.store.setMany, (values) => {
    if (!isPlainObject(values)) throw new Error('Invalid values');
    const validated: Partial<StoreSchema> = {};
    for (const [key, value] of Object.entries(values)) {
      const storeKey = requireStoreKey(key);
      if (!isValidStoreValue(storeKey, value)) throw new Error(`Invalid value for ${storeKey}`);
      Object.assign(validated, { [storeKey]: value });
    }
    setMany(validated);
  });

  handle(IPC_CHANNELS.store.append, (key, item) => {
    if (!isAppendableStoreKey(key)) throw new Error('Collection does not support append');
    if (key === 'completedOrders') {
      if (!isOrder(item)) throw new Error('Invalid order record');
      appendValue('completedOrders', item);
    } else {
      if (!isShift(item)) throw new Error('Invalid shift record');
      appendValue('shifts', item);
    }
  });

  handle(IPC_CHANNELS.store.getAll, () => getAll());

  handle(IPC_CHANNELS.store.reset, () => resetToDemoData());
}

function registerPrintHandlers(): void {
  handle(IPC_CHANNELS.print.receipt, (html, options) =>
    printDocument('receipt', requireHtml(html), requirePrintJobOptions(options)),
  );
  handle(IPC_CHANNELS.print.kot, (html, options) => printDocument('kot', requireHtml(html), requirePrintJobOptions(options)));
  handle(IPC_CHANNELS.print.savePdf, (html, options) => savePdf(requireHtml(html), requireSavePdfOptions(options)));
  handle(IPC_CHANNELS.print.getPrinters, () => getPrinters());
}

function registerDataHandlers(): void {
  handle(IPC_CHANNELS.data.export, () => exportBackup());
  handle(IPC_CHANNELS.data.pickImport, () => pickImport());
  handle(IPC_CHANNELS.data.applyImport, (token) => applyImport(requireString(token, 'token', APP_CONFIG.ipcLimits.token)));
  handle(IPC_CHANNELS.data.saveCsv, (fileName, content) =>
    saveCsvFile(requireString(fileName, 'file name', APP_CONFIG.ipcLimits.fileName), requireString(content, 'report', APP_CONFIG.reports.maxCsvChars)),
  );
}

function registerAppHandlers(): void {
  handle(IPC_CHANNELS.app.getVersion, () => app.getVersion());

  handle(
    IPC_CHANNELS.app.getInfo,
    (): AppInfo => ({
      name: APP_CONFIG.name,
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      userDataPath: app.getPath('userData'),
    }),
  );

  handle(IPC_CHANNELS.app.setNativeTheme, (theme) => applyNativeTheme(requireTheme(theme)));

  handle(IPC_CHANNELS.app.openDataFolder, async () => {
    const error = await shell.openPath(app.getPath('userData'));
    if (error) throw new Error(error);
  });
}

export function registerIpcHandlers(): void {
  registerStoreHandlers();
  registerPrintHandlers();
  registerDataHandlers();
  registerAppHandlers();
  logger.info(`IPC ready (${STORE_KEYS.length} store collections)`);
}

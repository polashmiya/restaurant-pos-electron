import { expect, test } from '@playwright/test';
import { createUserDataDir, launchApp, removeUserDataDir, type LaunchedApp } from './helpers';

let userDataDir: string;
let launched: LaunchedApp;

test.beforeAll(async () => {
  userDataDir = createUserDataDir();
  launched = await launchApp(userDataDir);
});

test.afterAll(async () => {
  await launched?.app.close();
  removeUserDataDir(userDataDir);
});

test('main window uses a secure BrowserWindow configuration', async () => {
  const preferences = await launched.app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    // Runtime API that Electron's typings do not declare.
    const contents = window?.webContents as unknown as {
      getLastWebPreferences?: () => Record<string, unknown> | null;
    };
    const prefs = contents?.getLastWebPreferences?.();
    return {
      contextIsolation: prefs?.contextIsolation,
      nodeIntegration: prefs?.nodeIntegration,
      sandbox: prefs?.sandbox,
      webSecurity: prefs?.webSecurity,
    };
  });

  expect(preferences).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true });
});

test('renderer cannot access Node.js or Electron internals', async () => {
  const exposure = await launched.window.evaluate(() => {
    const scope = globalThis as unknown as Record<string, unknown>;
    return {
      require: typeof scope.require,
      process: typeof scope.process,
      module: typeof scope.module,
      buffer: typeof scope.Buffer,
      ipcRenderer: 'ipcRenderer' in scope,
      electron: 'electron' in scope,
    };
  });

  expect(exposure).toEqual({
    require: 'undefined',
    process: 'undefined',
    module: 'undefined',
    buffer: 'undefined',
    ipcRenderer: false,
    electron: false,
  });
});

test('only the explicit, typed API is exposed on window.electronAPI', async () => {
  const surface = await launched.window.evaluate(() => {
    const api = window.electronAPI;
    return {
      namespaces: Object.keys(api ?? {}).sort(),
      store: Object.keys(api?.store ?? {}).sort(),
      print: Object.keys(api?.print ?? {}).sort(),
      data: Object.keys(api?.data ?? {}).sort(),
      app: Object.keys(api?.app ?? {}).sort(),
    };
  });

  expect(surface).toEqual({
    namespaces: ['app', 'data', 'print', 'store'],
    store: ['append', 'delete', 'get', 'getAll', 'reset', 'set', 'setMany'],
    print: ['getPrinters', 'kot', 'receipt', 'savePdf'],
    data: ['applyImport', 'exportBackup', 'pickImport', 'saveCsv'],
    app: ['getInfo', 'getVersion', 'openDataFolder', 'setNativeTheme'],
  });
});

test('IPC round trip works and invalid requests are rejected', async () => {
  const result = await launched.window.evaluate(async () => {
    const api = window.electronAPI;
    if (!api) throw new Error('electronAPI missing');
    const version = await api.app.getVersion();
    const settings = await api.store.get('settings');

    const rejects = async (action: () => Promise<unknown>) => {
      try {
        await action();
        return false;
      } catch {
        return true;
      }
    };

    return {
      version,
      language: settings?.language,
      unknownKeyRejected: await rejects(() => api.store.get('secrets' as never)),
      invalidValueRejected: await rejects(() => api.store.set('tables', 'not-a-list' as never)),
      invalidAppendRejected: await rejects(() => api.store.append('completedOrders', { id: 1 } as never)),
      invalidThemeRejected: await rejects(() => api.app.setNativeTheme('neon' as never)),
      invalidCsvRejected: await rejects(() => api.data.saveCsv({ path: 'C:/x' } as never, 'a,b')),
      oversizedFileNameRejected: await rejects(() => api.data.saveCsv('x'.repeat(500), 'a,b')),
      invalidPrintOptionsRejected: await rejects(() =>
        api.print.receipt('<p>x</p>', { printerName: 42, paperWidth: '80mm', copies: 1, title: 'x' } as never),
      ),
      invalidPdfDocumentRejected: await rejects(() => api.print.savePdf(42 as never, { paperWidth: '80mm', fileName: 'x' })),
      invalidPdfPaperRejected: await rejects(() => api.print.savePdf('<p>x</p>', { paperWidth: 'A4', fileName: 'x' } as never)),
      oversizedPdfNameRejected: await rejects(() => api.print.savePdf('<p>x</p>', { paperWidth: '80mm', fileName: 'x'.repeat(500) })),
    };
  });

  expect(result.version).toMatch(/^\d+\.\d+\.\d+/);
  expect(result.language).toBe('bn');
  expect(result.unknownKeyRejected).toBe(true);
  expect(result.invalidValueRejected).toBe(true);
  expect(result.invalidAppendRejected).toBe(true);
  expect(result.invalidThemeRejected).toBe(true);
  expect(result.invalidCsvRejected).toBe(true);
  expect(result.oversizedFileNameRejected).toBe(true);
  expect(result.invalidPrintOptionsRejected).toBe(true);
  expect(result.invalidPdfDocumentRejected).toBe(true);
  expect(result.invalidPdfPaperRejected).toBe(true);
  expect(result.oversizedPdfNameRejected).toBe(true);
});

test('remote network requests are blocked (offline-only application)', async () => {
  const blocked = await launched.window.evaluate(async () => {
    try {
      await fetch('https://example.com/');
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});

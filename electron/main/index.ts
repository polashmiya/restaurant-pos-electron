import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { APP_CONFIG } from '@/config/app.config';
import { registerIpcHandlers } from './ipcHandlers';
import { logger } from './logger';
import { cleanupPrintTempFiles } from './printManager';
import { hardenSession, hardenWebContentsCreation } from './security';
import { initializeStore } from './store';
import { applyNativeTheme, createMainWindow, focusMainWindow, loadRenderer, setupApplicationMenu } from './windowManager';

/* ==========================================================================
   Application lifecycle (master spec §73):

   Electron starts → secure BrowserWindow → initialize electron-store →
   seed missing data → register IPC → React starts and loads settings,
   shift, tables and orders through the preload bridge.
   ========================================================================== */

/**
 * Data location. Development builds use a separate folder so testing never
 * touches a restaurant's real data. POS_USER_DATA_DIR overrides both
 * (portable installs, automated tests).
 */
function configureUserDataPath(): void {
  const override = process.env.POS_USER_DATA_DIR;
  if (override) {
    app.setPath('userData', path.resolve(override));
  } else if (!app.isPackaged) {
    app.setPath('userData', path.join(app.getPath('appData'), `${APP_CONFIG.name} Dev`));
  }
}

async function startApplication(): Promise<void> {
  hardenSession();
  setupApplicationMenu();
  cleanupPrintTempFiles();

  const window = createMainWindow();

  const data = initializeStore();
  applyNativeTheme(data.settings.theme);

  registerIpcHandlers();

  await loadRenderer(window);
  logger.info(`${APP_CONFIG.name} ${app.getVersion()} started`);
}

function reportFatalStartupError(error: unknown): void {
  logger.error('Application failed to start', error);
  dialog.showErrorBox(
    `${APP_CONFIG.name}`,
    `The application could not start.\nঅ্যাপ্লিকেশন চালু করা যায়নি।\n\n${error instanceof Error ? error.message : String(error)}`,
  );
  app.exit(1);
}

configureUserDataPath();
// Every renderer (main window and print windows) runs in the Chromium sandbox.
app.enableSandbox();

// Only one instance may write to the local data files at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  hardenWebContentsCreation();

  app
    .whenReady()
    .then(startApplication)
    .catch(reportFatalStartupError);

  app.on('activate', () => {
    // macOS: re-create the window when the dock icon is clicked.
    if (BrowserWindow.getAllWindows().length === 0) {
      const window = createMainWindow();
      loadRenderer(window).catch((error: unknown) => logger.error('Failed to reload window', error));
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  process.on('uncaughtException', (error) => logger.error('Uncaught exception in main process', error));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection in main process', reason));
}

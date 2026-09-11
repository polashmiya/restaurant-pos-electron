import type {
  AppendableItem,
  AppendableStoreKey,
  BackupSummary,
  PaperWidth,
  StoreKey,
  StoreSchema,
  Theme,
} from '../../src/types';

/* ==========================================================================
   Typed contract between the preload script and the renderer.
   The renderer reaches Electron ONLY through window.electronAPI.
   ========================================================================== */

export interface AppInfo {
  name: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
  userDataPath: string;
}

export interface ElectronStoreAPI {
  get<K extends StoreKey>(key: K): Promise<StoreSchema[K] | undefined>;
  set<K extends StoreKey>(key: K, value: StoreSchema[K]): Promise<void>;
  delete(key: StoreKey): Promise<void>;
  /** Writes several collections; collections in the same file are written atomically. */
  setMany(values: Partial<StoreSchema>): Promise<void>;
  /** Appends one record to an array collection without resending the whole array. */
  append<K extends AppendableStoreKey>(key: K, item: AppendableItem<K>): Promise<void>;
  /** Loads every collection in one round trip (startup/refresh). */
  getAll(): Promise<StoreSchema>;
  /** Backs up current data, then restores demo data and default settings. */
  reset(): Promise<StoreSchema>;
}

/**
 * A print job. It always goes straight to the printer: the printer and the
 * number of copies are chosen in the app's own print dialog, never in the
 * operating system's dialog.
 */
export interface PrintJobOptions {
  /** Printer device name; empty = system default printer. */
  printerName: string;
  paperWidth: PaperWidth;
  copies: number;
  /** Title of the print job (shown in the printer queue). */
  title: string;
}

export interface SavePdfOptions {
  paperWidth: PaperWidth;
  /** Suggested file name; the user picks the folder and may rename it. */
  fileName: string;
}

export type PrintOutcome = 'printed' | 'cancelled' | 'failed' | 'saved-pdf';

/** Why a job failed; the renderer turns it into a cashier-friendly message. */
export type PrintFailure = 'no-printer' | 'printer-not-found' | 'timeout' | 'error';

export interface PrintResult {
  outcome: PrintOutcome;
  failure?: PrintFailure;
  /** Technical reason for logs; never shown raw to cashiers. */
  reason?: string;
}

export interface PrinterInfo {
  /** System printer name (used as the device name when printing). */
  name: string;
  displayName: string;
  description: string;
}

export interface ElectronPrintAPI {
  receipt(html: string, options: PrintJobOptions): Promise<PrintResult>;
  kot(html: string, options: PrintJobOptions): Promise<PrintResult>;
  /** Shows a save dialog and writes the document as a PDF file. */
  savePdf(html: string, options: SavePdfOptions): Promise<ExportResult>;
  getPrinters(): Promise<PrinterInfo[]>;
}

export type ExportResult = { ok: true; filePath: string } | { ok: false; reason: 'cancelled' | 'failed' };

export type PickImportResult =
  | { ok: true; token: string; summary: BackupSummary }
  | { ok: false; reason: 'cancelled' | 'invalid' | 'failed' };

export type ApplyImportResult = { ok: true; data: StoreSchema } | { ok: false; reason: 'expired' | 'failed' };

export interface ElectronDataAPI {
  /** Shows a save dialog and writes a JSON backup. */
  exportBackup(): Promise<ExportResult>;
  /** Shows an open dialog, reads and validates a backup (does not apply it). */
  pickImport(): Promise<PickImportResult>;
  /** Applies a previously validated backup after the user confirmed. */
  applyImport(token: string): Promise<ApplyImportResult>;
  /** Shows a save dialog and writes a UTF-8 CSV report (Excel compatible). */
  saveCsv(fileName: string, content: string): Promise<ExportResult>;
}

export interface ElectronAppAPI {
  getVersion(): Promise<string>;
  getInfo(): Promise<AppInfo>;
  /** Keeps native UI (title bar, dialogs, scrollbars) in sync with the app theme. */
  setNativeTheme(theme: Theme): Promise<void>;
  openDataFolder(): Promise<void>;
}

export interface ElectronAPI {
  store: ElectronStoreAPI;
  print: ElectronPrintAPI;
  data: ElectronDataAPI;
  app: ElectronAppAPI;
}

declare global {
  interface Window {
    /** Present only when running inside the Electron desktop app. */
    electronAPI?: ElectronAPI;
  }
}

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app, dialog } from 'electron';
import { APP_CONFIG } from '@/config/app.config';
import { createBackupFile, parseBackupFile, summarizeBackup } from '@/data/backup';
import type { BackupFile, StoreSchema } from '@/types';
import { formatIsoDay } from '@/utils/format';
import type { ApplyImportResult, ExportResult, PickImportResult } from '../types/electron';
import { safeFileName, writeFileAtomic } from './files';
import { logger } from './logger';
import { getAll, replaceAllData } from './store';
import { getMainWindow } from './windowManager';

/* ==========================================================================
   Local JSON backup / restore (master spec §99) and demo data reset (§75).
   Nothing is uploaded — files are only written where the user chooses and
   to <userData>/backups for automatic safety copies.
   ========================================================================== */

const MAX_IMPORT_BYTES = 512 * 1024 * 1024;
const PENDING_IMPORT_TTL_MS = 10 * 60 * 1000;

const pendingImports = new Map<string, { backup: BackupFile; expiresAt: number }>();

function backupsDirectory(): string {
  return path.join(app.getPath('userData'), 'backups');
}

function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  return writeFileAtomic(filePath, JSON.stringify(value, null, 2));
}

function pruneAutoBackups(): void {
  const directory = backupsDirectory();
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.startsWith('auto-') && file.endsWith('.json'))
    .sort();
  const excess = files.length - APP_CONFIG.backup.maxAutoBackups;
  for (const file of files.slice(0, Math.max(0, excess))) {
    fs.rmSync(path.join(directory, file), { force: true });
  }
}

/** Saves a safety copy of all current data before a destructive action. */
export async function writeAutoBackup(reason: 'before-reset' | 'before-import'): Promise<string> {
  const directory = backupsDirectory();
  await fs.promises.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(directory, `auto-${stamp}-${reason}.json`);
  await writeJsonAtomic(filePath, createBackupFile(getAll(), app.getVersion(), new Date()));
  pruneAutoBackups();
  logger.info(`Safety backup written: ${filePath}`);
  return filePath;
}

export async function exportBackup(): Promise<ExportResult> {
  const window = getMainWindow();
  const defaultPath = path.join(
    app.getPath('documents'),
    `${APP_CONFIG.backup.fileNamePrefix}-${formatIsoDay(new Date())}.json`,
  );
  const options = { defaultPath, filters: [{ name: 'JSON', extensions: ['json'] }] };
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return { ok: false, reason: 'cancelled' };

  try {
    await writeJsonAtomic(result.filePath, createBackupFile(getAll(), app.getVersion(), new Date()));
    logger.info(`Backup exported: ${result.filePath}`);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    logger.error('Backup export failed', error);
    return { ok: false, reason: 'failed' };
  }
}

/** Lets the user pick a backup and validates it WITHOUT applying it yet. */
export async function pickImport(): Promise<PickImportResult> {
  const window = getMainWindow();
  const options = {
    properties: ['openFile' as const],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  const filePath = result.filePaths[0];
  if (result.canceled || !filePath) return { ok: false, reason: 'cancelled' };

  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.size > MAX_IMPORT_BYTES) return { ok: false, reason: 'invalid' };
    const text = await fs.promises.readFile(filePath, 'utf-8');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'invalid' };
    }
    const parsed = parseBackupFile(json);
    if (!parsed.ok) {
      logger.warn(`Rejected backup ${filePath}: ${parsed.error}`);
      return { ok: false, reason: 'invalid' };
    }
    const token = randomUUID();
    pendingImports.set(token, { backup: parsed.backup, expiresAt: Date.now() + PENDING_IMPORT_TTL_MS });
    return { ok: true, token, summary: summarizeBackup(parsed.backup) };
  } catch (error) {
    logger.error('Backup import could not be read', error);
    return { ok: false, reason: 'failed' };
  }
}

/** Applies a validated backup after the user confirmed the replacement. */
export async function applyImport(token: string): Promise<ApplyImportResult> {
  const pending = pendingImports.get(token);
  pendingImports.delete(token);
  if (!pending || pending.expiresAt < Date.now()) return { ok: false, reason: 'expired' };

  try {
    await writeAutoBackup('before-import');
    const data: StoreSchema = replaceAllData({ ...pending.backup.data });
    logger.info(`Backup from ${pending.backup.exportedAt} imported`);
    return { ok: true, data };
  } catch (error) {
    logger.error('Backup import failed', error);
    return { ok: false, reason: 'failed' };
  }
}

/** Longest CSV report accepted from the renderer (characters). */
export const MAX_CSV_CHARS = 50 * 1024 * 1024;

/** Saves a CSV report where the user chooses (UTF-8 with BOM so Excel shows Bangla correctly). */
export async function saveCsvFile(fileName: string, content: string): Promise<ExportResult> {
  const window = getMainWindow();
  const options = {
    defaultPath: path.join(app.getPath('documents'), safeFileName(fileName, 'csv', 'report')),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  };
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return { ok: false, reason: 'cancelled' };

  try {
    await writeFileAtomic(result.filePath, `\uFEFF${content}`);
    logger.info(`Report exported: ${result.filePath}`);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    logger.error('Report export failed', error);
    return { ok: false, reason: 'failed' };
  }
}

/** Reset demo data: clears orders/shifts and restores seed menu, tables and settings. */
export async function resetToDemoData(): Promise<StoreSchema> {
  await writeAutoBackup('before-reset');
  const data = replaceAllData({});
  logger.info('Demo data restored');
  return data;
}

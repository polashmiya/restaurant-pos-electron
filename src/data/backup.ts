import type { BackupFile, BackupSummary, StoreSchema } from '@/types';
import { mergeWithDefaultSettings } from './defaults';
import { isPlainObject } from './storeKeys';
import { isCategory, isDiningTable, isMenuItem, isOrder, isOrderCounter, isShift } from './validators';

export const BACKUP_APP_ID = 'restaurant-pos';
export const BACKUP_FORMAT_VERSION = 1;

export function createBackupFile(data: StoreSchema, appVersion: string, now: Date): BackupFile {
  return {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    appVersion,
    data: {
      settings: data.settings,
      categories: data.categories,
      menuItems: data.menuItems,
      tables: data.tables,
      openOrders: data.openOrders,
      completedOrders: data.completedOrders,
      shifts: data.shifts,
      orderCounter: data.orderCounter,
    },
  };
}

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

function validateArray(value: unknown, check: (item: unknown) => boolean, label: string): string | null {
  if (!Array.isArray(value)) return `${label} must be an array`;
  const invalidIndex = value.findIndex((item) => !check(item));
  return invalidIndex === -1 ? null : `${label}[${invalidIndex}] is invalid`;
}

/**
 * Validates an untrusted JSON value before it may replace existing data.
 * Every record is checked; nothing is written unless the whole file is valid.
 */
export function parseBackupFile(raw: unknown): ParseBackupResult {
  if (!isPlainObject(raw)) return { ok: false, error: 'Backup must be a JSON object' };
  if (raw.app !== BACKUP_APP_ID) return { ok: false, error: 'Not a Restaurant POS backup' };
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) return { ok: false, error: 'Unsupported backup version' };
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    return { ok: false, error: 'Missing export date' };
  }
  const data = raw.data;
  if (!isPlainObject(data)) return { ok: false, error: 'Missing data section' };
  if (!isPlainObject(data.settings)) return { ok: false, error: 'settings must be an object' };
  if (!isOrderCounter(data.orderCounter)) return { ok: false, error: 'orderCounter is invalid' };

  const checks = [
    validateArray(data.categories, isCategory, 'categories'),
    validateArray(data.menuItems, isMenuItem, 'menuItems'),
    validateArray(data.tables, isDiningTable, 'tables'),
    validateArray(data.openOrders, isOrder, 'openOrders'),
    validateArray(data.completedOrders, isOrder, 'completedOrders'),
    validateArray(data.shifts, isShift, 'shifts'),
  ];
  const firstError = checks.find((error) => error !== null);
  if (firstError) return { ok: false, error: firstError };

  const backup: BackupFile = {
    app: BACKUP_APP_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: raw.exportedAt,
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : 'unknown',
    data: {
      settings: mergeWithDefaultSettings(data.settings),
      categories: data.categories as BackupFile['data']['categories'],
      menuItems: data.menuItems as BackupFile['data']['menuItems'],
      tables: data.tables as BackupFile['data']['tables'],
      openOrders: data.openOrders as BackupFile['data']['openOrders'],
      completedOrders: data.completedOrders as BackupFile['data']['completedOrders'],
      shifts: data.shifts as BackupFile['data']['shifts'],
      orderCounter: data.orderCounter,
    },
  };
  return { ok: true, backup };
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    menuItems: backup.data.menuItems.length,
    categories: backup.data.categories.length,
    tables: backup.data.tables.length,
    completedOrders: backup.data.completedOrders.length,
    openOrders: backup.data.openOrders.length,
    shifts: backup.data.shifts.length,
  };
}

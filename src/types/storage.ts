import type { ISODateString } from './common';
import type { Category, MenuItem } from './menu';
import type { Order } from './order';
import type { AppSettings } from './settings';
import type { Shift } from './shift';
import type { DiningTable } from './table';

export interface AppMeta {
  schemaVersion: number;
  seededAt?: ISODateString;
  lastStartedAt?: ISODateString;
}

/** Daily order-number sequence (ORD-YYYYMMDD-####). */
export interface OrderCounter {
  /** Local date key YYYYMMDD. */
  date: string;
  sequence: number;
}

/** Restores the POS working order after a restart. */
export interface PosSession {
  currentOrderId?: string;
}

/** Everything persisted by electron-store, keyed by collection. */
export interface StoreSchema {
  meta: AppMeta;
  settings: AppSettings;
  categories: Category[];
  menuItems: MenuItem[];
  tables: DiningTable[];
  /** Draft (in progress / table) and held orders. */
  openOrders: Order[];
  /** Completed and cancelled orders (history). */
  completedOrders: Order[];
  shifts: Shift[];
  orderCounter: OrderCounter;
  session: PosSession;
}

export type StoreKey = keyof StoreSchema;

/** Collections that support the append operation. */
export type AppendableStoreKey = 'completedOrders' | 'shifts';

export type AppendableItem<K extends AppendableStoreKey> = StoreSchema[K][number];

/** JSON backup file format (Settings → Data → Export). */
export interface BackupFile {
  app: 'restaurant-pos';
  formatVersion: 1;
  exportedAt: ISODateString;
  appVersion: string;
  data: Omit<StoreSchema, 'meta' | 'session'>;
}

export interface BackupSummary {
  exportedAt: ISODateString;
  appVersion: string;
  menuItems: number;
  categories: number;
  tables: number;
  completedOrders: number;
  openOrders: number;
  shifts: number;
}

import type { ISODateString } from './common';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'waiting';

export interface Reservation {
  guestName: string;
  phone?: string;
  /** Local time "HH:mm" of the booking. */
  time: string;
  guests: number;
  note?: string;
  createdAt: ISODateString;
}

export interface DiningTable {
  id: string;
  number: number;
  /** Display name, e.g. "05" or "VIP-1". */
  name: string;
  capacity: number;
  status: TableStatus;
  activeOrderId?: string;
  reservation?: Reservation;
  /** When the current status started (occupied since…). */
  statusSince?: ISODateString;
}

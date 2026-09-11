import type { ISODateString } from './common';

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: string;
  openedAt: ISODateString;
  closedAt?: ISODateString;

  cashierName: string;

  openingCash: number;
  /** Cash counted in the drawer when the shift was closed. */
  closingCash?: number;

  totalSales: number;
  cashSales: number;
  cardSales: number;
  mobileSales: number;
  taxCollected: number;
  discountTotal: number;
  orderCount: number;

  status: ShiftStatus;
  notes?: string;

  /** Generated together with demo sales; removable in one step. */
  sample?: boolean;
}

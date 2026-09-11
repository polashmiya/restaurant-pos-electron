import type { Language, LocalizedText, NumberFormat, Theme } from './common';

export type PaperWidth = '80mm' | '58mm';

export type LayoutDensity = 'comfortable' | 'compact';

/** Size of all text; the whole interface (sized in rem) scales with it. */
export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';

/** Width of menu item and table cards. */
export type CardSize = 'small' | 'medium' | 'large';

/** Color of buttons, selections and highlights. */
export type AccentColor = 'blue' | 'green' | 'violet' | 'orange' | 'teal';

/** How tables are drawn on the Tables page: from above, or in 3D. */
export type TableView = 'plan' | 'iso';

/** Restaurant profile + core preferences (see master spec §50). */
export interface RestaurantSettings {
  name: LocalizedText;
  address: LocalizedText;
  phone: string;
  taxId: string;
  currency: string;
  currencySymbol: string;
  /** Percentage, e.g. 5 for 5% */
  defaultTaxRate: number;
  language: Language;
  theme: Theme;
}

export interface PrinterSettings {
  /** Printer device name; empty string = system default printer. */
  receiptPrinter: string;
  /** Printer device name; empty string = system default printer. */
  kotPrinter: string;
  paperWidth: PaperWidth;
  /** Print straight to the printer without the system dialog. */
  silentPrint: boolean;
  autoPrintReceipt: boolean;
  autoPrintKot: boolean;
  showPricesOnKot: boolean;
  receiptCopies: number;
}

export interface UIPreferences {
  density: LayoutDensity;
  showItemImages: boolean;
  soundEffects: boolean;
  textSize: TextSize;
  cardSize: CardSize;
  accentColor: AccentColor;
  tableView: TableView;
  /** Ask for the number of guests when a table is seated. */
  askGuestCount: boolean;
}

export interface AppSettings extends RestaurantSettings {
  numberFormat: NumberFormat;
  /** Extra line printed at the bottom of receipts. */
  receiptFooter: LocalizedText;
  printer: PrinterSettings;
  ui: UIPreferences;
}

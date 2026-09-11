import type { LocalizedText } from './common';

/** Icon keys resolved to Lucide icons in the renderer (see categoryVisuals). */
export type CategoryIcon =
  | 'appetizer'
  | 'main'
  | 'pizza'
  | 'burger'
  | 'rice'
  | 'grill'
  | 'beverage'
  | 'dessert'
  | 'soup'
  | 'salad'
  | 'coffee'
  | 'general';

/** Tint keys mapped to theme tokens (see theme.css → --c-tint-*). */
export type CategoryColor = 'orange' | 'red' | 'amber' | 'green' | 'teal' | 'blue' | 'violet' | 'pink';

export interface Category {
  id: string;
  name: LocalizedText;
  icon: CategoryIcon;
  color: CategoryColor;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  code: string;
  name: LocalizedText;
  description?: LocalizedText;
  categoryId: string;
  price: number;
  /**
   * Optional local image: a data URL picked in Settings, or a photo bundled
   * with the app ("images/menu/…"). Never a remote URL.
   */
  image?: string;
  isAvailable: boolean;
  /** Overrides the default tax rate (percentage) when set. */
  taxRate?: number;
  /** Minutes */
  preparationTime?: number;
  sortOrder?: number;
}

/** Quick kitchen instructions offered in the item-note editor. */
export interface NotePreset {
  id: string;
  label: LocalizedText;
}

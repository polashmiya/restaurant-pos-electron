import {
  CakeSlice,
  Coffee,
  CookingPot,
  CupSoda,
  Drumstick,
  Flame,
  Hamburger,
  Pizza,
  Salad,
  Soup,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryColor, CategoryIcon } from '@/types';

/** Lucide icon for each category icon key (menu placeholders, tabs). */
export const CATEGORY_ICONS: Record<CategoryIcon, LucideIcon> = {
  appetizer: Drumstick,
  main: CookingPot,
  pizza: Pizza,
  burger: Hamburger,
  rice: Soup,
  grill: Flame,
  beverage: CupSoda,
  dessert: CakeSlice,
  soup: Soup,
  salad: Salad,
  coffee: Coffee,
  general: Utensils,
};

export const FALLBACK_CATEGORY_ICON: LucideIcon = UtensilsCrossed;

interface TintClasses {
  /** Soft background for image placeholders. */
  surface: string;
  /** Icon / accent text color. */
  text: string;
  /** Solid accent strip. */
  strip: string;
}

/** Full class names (static so Tailwind generates them) per tint token. */
export const CATEGORY_TINTS: Record<CategoryColor, TintClasses> = {
  orange: { surface: 'bg-tint-orange/15', text: 'text-tint-orange', strip: 'bg-tint-orange' },
  red: { surface: 'bg-tint-red/15', text: 'text-tint-red', strip: 'bg-tint-red' },
  amber: { surface: 'bg-tint-amber/15', text: 'text-tint-amber', strip: 'bg-tint-amber' },
  green: { surface: 'bg-tint-green/15', text: 'text-tint-green', strip: 'bg-tint-green' },
  teal: { surface: 'bg-tint-teal/15', text: 'text-tint-teal', strip: 'bg-tint-teal' },
  blue: { surface: 'bg-tint-blue/15', text: 'text-tint-blue', strip: 'bg-tint-blue' },
  violet: { surface: 'bg-tint-violet/15', text: 'text-tint-violet', strip: 'bg-tint-violet' },
  pink: { surface: 'bg-tint-pink/15', text: 'text-tint-pink', strip: 'bg-tint-pink' },
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIcon[];
export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_TINTS) as CategoryColor[];

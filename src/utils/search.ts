import type { MenuItem } from '@/types';
import { toWesternDigits } from './format';

/**
 * Unicode-aware, case-insensitive search normalization: NFC composition (so
 * differently typed Bangla vowel signs match), lower case, western digits
 * and collapsed whitespace.
 */
export function normalizeSearchText(value: string): string {
  return toWesternDigits(value.normalize('NFC'))
    .toLocaleLowerCase()
    // Zero-width (non-)joiners change Bangla rendering but not meaning.
    .replace(/[\u200C\u200D]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildMenuSearchText(item: Pick<MenuItem, 'name' | 'code' | 'description'>): string {
  return normalizeSearchText([item.name.bn, item.name.en, item.code].join(' '));
}

/**
 * Matches when every word of the query appears in the Bangla name, English
 * name or item code ("burger", "বার্গার", "BUR-001", "chicken burger").
 */
export function matchesSearch(searchText: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizedQuery.split(' ').every((token) => searchText.includes(token));
}

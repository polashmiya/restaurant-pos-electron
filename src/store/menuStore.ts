import { useDeferredValue, useMemo } from 'react';
import { create } from 'zustand';
import { getStorage } from '@/services/storage';
import type { Category, MenuItem } from '@/types';
import { AppError } from '@/utils/errors';
import { buildMenuSearchText, matchesSearch, normalizeSearchText } from '@/utils/search';

export const ALL_CATEGORIES = 'all';

interface MenuState {
  categories: Category[];
  items: MenuItem[];
  /** Category tab selected on the POS ('all' or a category id). */
  selectedCategoryId: string;
  searchQuery: string;

  hydrate: (categories: Category[], items: MenuItem[]) => void;
  selectCategory: (categoryId: string) => void;
  setSearchQuery: (query: string) => void;

  /** Menu management (Settings → Menu). Each persists before updating state. */
  saveItem: (item: MenuItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  setItemAvailability: (itemId: string, isAvailable: boolean) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
}

async function persist<T>(key: 'menuItems' | 'categories', value: T[]): Promise<void> {
  try {
    await getStorage().set(key, value as never);
  } catch (error) {
    throw new AppError('storage', 'errors.dataSaveFailed', { cause: error });
  }
}

export const useMenuStore = create<MenuState>()((set, get) => ({
  categories: [],
  items: [],
  selectedCategoryId: ALL_CATEGORIES,
  searchQuery: '',

  hydrate: (categories, items) => {
    const selected = get().selectedCategoryId;
    const stillExists = selected === ALL_CATEGORIES || categories.some((category) => category.id === selected);
    set({ categories, items, selectedCategoryId: stillExists ? selected : ALL_CATEGORIES });
  },

  selectCategory: (categoryId) => set({ selectedCategoryId: categoryId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  saveItem: async (item) => {
    const { items } = get();
    const code = normalizeSearchText(item.code);
    if (code && items.some((existing) => existing.id !== item.id && normalizeSearchText(existing.code) === code)) {
      throw new AppError('conflict', 'settings.menu.codeExists');
    }
    const exists = items.some((existing) => existing.id === item.id);
    const next = exists ? items.map((existing) => (existing.id === item.id ? item : existing)) : [...items, item];
    await persist('menuItems', next);
    set({ items: next });
  },

  deleteItem: async (itemId) => {
    const next = get().items.filter((item) => item.id !== itemId);
    await persist('menuItems', next);
    set({ items: next });
  },

  setItemAvailability: async (itemId, isAvailable) => {
    const next = get().items.map((item) => (item.id === itemId ? { ...item, isAvailable } : item));
    await persist('menuItems', next);
    set({ items: next });
  },

  saveCategory: async (category) => {
    const { categories } = get();
    const exists = categories.some((existing) => existing.id === category.id);
    const next = exists
      ? categories.map((existing) => (existing.id === category.id ? category : existing))
      : [...categories, category];
    await persist('categories', next);
    set({ categories: next });
  },

  deleteCategory: async (categoryId) => {
    if (get().items.some((item) => item.categoryId === categoryId)) {
      throw new AppError('conflict', 'settings.menu.categoryHasItems');
    }
    const next = get().categories.filter((category) => category.id !== categoryId);
    await persist('categories', next);
    set((state) => ({
      categories: next,
      selectedCategoryId: state.selectedCategoryId === categoryId ? ALL_CATEGORIES : state.selectedCategoryId,
    }));
  },
}));

/* -------------------------------- Selectors -------------------------------- */

export function useSortedCategories(): Category[] {
  const categories = useMenuStore((state) => state.categories);
  return useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder), [categories]);
}

/**
 * Menu items for the POS grid: filtered by category and search (Bangla,
 * English or code). Derived on the fly — never stored.
 */
export function useFilteredMenuItems(): MenuItem[] {
  const items = useMenuStore((state) => state.items);
  const categoryId = useMenuStore((state) => state.selectedCategoryId);
  const query = useDeferredValue(useMenuStore((state) => state.searchQuery));

  const indexed = useMemo(
    () =>
      [...items]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((item) => ({ item, searchText: buildMenuSearchText(item) })),
    [items],
  );

  return useMemo(() => {
    const searching = query.trim().length > 0;
    return indexed
      .filter(({ item, searchText }) => {
        // A search looks across all categories so cashiers never miss an item.
        if (!searching && categoryId !== ALL_CATEGORIES && item.categoryId !== categoryId) return false;
        return matchesSearch(searchText, query);
      })
      .map(({ item }) => item);
  }, [indexed, categoryId, query]);
}

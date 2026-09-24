import { Pencil, Plus, Trash, UtensilsCrossed } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { ItemImage } from '@/components/common/ItemImage';
import { SearchInput } from '@/components/common/SearchInput';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Select } from '@/components/common/Select';
import { CATEGORY_ICONS, CATEGORY_TINTS, FALLBACK_CATEGORY_ICON } from '@/components/pos/categoryVisuals';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { attempt } from '@/services/actionRunner';
import { useMenuStore, useSortedCategories } from '@/store/menuStore';
import { confirmAction, toast } from '@/store/uiStore';
import type { Category, MenuItem } from '@/types';
import { cn } from '@/utils/cn';
import { buildMenuSearchText, matchesSearch } from '@/utils/search';
import { CategoryFormModal } from './CategoryFormModal';
import { MenuItemFormModal } from './MenuItemFormModal';
import { SettingsSection } from './SettingsSection';

type Tab = 'items' | 'categories';
type Editing<T> = { mode: 'closed' } | { mode: 'open'; value?: T };

function ItemsList() {
  const { t } = useTranslation();
  const format = useFormatters();
  const items = useMenuStore((state) => state.items);
  const categories = useSortedCategories();
  const setAvailability = useMenuStore((state) => state.setItemAvailability);
  const deleteItem = useMenuStore((state) => state.deleteItem);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [editing, setEditing] = useState<Editing<MenuItem>>({ mode: 'closed' });
  const deferredQuery = useDeferredValue(query);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const visible = useMemo(
    () =>
      [...items]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .filter((item) => (categoryId === 'all' || item.categoryId === categoryId) && matchesSearch(buildMenuSearchText(item), deferredQuery)),
    [items, categoryId, deferredQuery],
  );

  const remove = async (item: MenuItem) => {
    const confirmed = await confirmAction({
      title: message('settings.menu.deleteItemTitle'),
      message: message('settings.menu.deleteItemMessage', { name: format.text(item.name) }),
      confirmLabel: message('common.delete'),
      tone: 'danger',
    });
    if (confirmed && (await attempt('delete-item', () => deleteItem(item.id)))) toast.success(message('settings.menu.itemDeleted'));
  };

  const toggle = async (item: MenuItem) => {
    if (await attempt('item-availability', () => setAvailability(item.id, !item.isAvailable))) {
      toast.success(message('settings.menu.availabilityChanged'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          label={t('settings.menu.searchItems')}
          className="w-full sm:w-auto sm:min-w-64 sm:flex-1"
        />
        <Select
          aria-label={t('settings.menu.category')}
          value={categoryId}
          onValueChange={setCategoryId}
          options={[{ value: 'all', label: t('settings.menu.allCategories') }, ...categories.map((category) => ({ value: category.id, label: format.text(category.name) }))]}
          containerClassName="min-w-0 flex-1 sm:min-w-52 sm:flex-none"
        />
        <Button variant="primary" icon={<Plus className="size-5" aria-hidden />} onClick={() => setEditing({ mode: 'open' })} disabled={categories.length === 0}>
          {t('settings.menu.addItem')}
        </Button>
      </div>
      <p className="text-sm text-fg-muted">{t('settings.menu.itemCount', { count: visible.length })}</p>

      {visible.length === 0 ? (
        <EmptyState compact icon={<UtensilsCrossed aria-hidden />} title={t('settings.menu.noItems')} />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border">
          {visible.map((item) => {
            const category = categoryById.get(item.categoryId);
            const tint = CATEGORY_TINTS[category?.color ?? 'blue'];
            const Icon = (category && CATEGORY_ICONS[category.icon]) || FALLBACK_CATEGORY_ICON;
            const name = format.text(item.name);
            return (
              // Phones: photo and name on the first line, price, availability
              // and the row's buttons on the second.
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <span className={cn('grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg', tint.surface)}>
                  <ItemImage
                    src={item.image}
                    className="size-full object-cover"
                    fallback={<Icon className={cn('size-6', tint.text)} aria-hidden />}
                  />
                </span>
                <div className="min-w-0 flex-1 basis-24">
                  <p className="truncate font-semibold">
                    {item.name.bn} <span className="text-fg-muted">/ {item.name.en}</span>
                  </p>
                  <p className="truncate text-sm text-fg-muted">
                    {item.code} · {category ? format.text(category.name) : '—'}
                  </p>
                </div>
                <span className="shrink-0 text-end font-bold tabular-nums sm:w-28">{format.currency(item.price)}</span>
                <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:w-auto sm:gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.isAvailable}
                    aria-label={item.isAvailable ? t('settings.menu.markUnavailable', { name }) : t('settings.menu.markAvailable', { name })}
                    onClick={() => void toggle(item)}
                    className={cn(
                      'min-h-10 min-w-0 truncate rounded-full px-3 text-sm font-semibold sm:min-w-28',
                      item.isAvailable ? 'bg-success/15 text-success-text' : 'bg-danger/15 text-danger-text',
                    )}
                  >
                    {item.isAvailable ? t('settings.menu.available') : t('pos.unavailable')}
                  </button>
                  <IconButton label={t('common.edit')} icon={<Pencil className="size-5" aria-hidden />} onClick={() => setEditing({ mode: 'open', value: item })} showTooltip={false} />
                  <IconButton label={t('common.delete')} icon={<Trash className="size-5" aria-hidden />} variant="danger-soft" onClick={() => void remove(item)} showTooltip={false} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing.mode === 'open' && <MenuItemFormModal item={editing.value} onClose={() => setEditing({ mode: 'closed' })} />}
    </div>
  );
}

function CategoriesList() {
  const { t } = useTranslation();
  const format = useFormatters();
  const categories = useSortedCategories();
  const items = useMenuStore((state) => state.items);
  const deleteCategory = useMenuStore((state) => state.deleteCategory);
  const [editing, setEditing] = useState<Editing<Category>>({ mode: 'closed' });

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    return counts;
  }, [items]);

  const remove = async (category: Category) => {
    if ((countByCategory.get(category.id) ?? 0) > 0) {
      toast.warning(message('settings.menu.categoryHasItems'));
      return;
    }
    const confirmed = await confirmAction({
      title: message('settings.menu.deleteCategoryTitle'),
      message: message('settings.menu.deleteCategoryMessage', { name: format.text(category.name) }),
      confirmLabel: message('common.delete'),
      tone: 'danger',
    });
    if (confirmed && (await attempt('delete-category', () => deleteCategory(category.id)))) {
      toast.success(message('settings.menu.categoryDeleted'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" icon={<Plus className="size-5" aria-hidden />} onClick={() => setEditing({ mode: 'open' })}>
          {t('settings.menu.addCategory')}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-card border border-border">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon] ?? FALLBACK_CATEGORY_ICON;
          const tint = CATEGORY_TINTS[category.color];
          return (
            <li key={category.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
              <span className={cn('grid size-12 shrink-0 place-items-center rounded-lg', tint.surface)}>
                <Icon className={cn('size-6', tint.text)} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 basis-32">
                <p className="truncate font-semibold">
                  {category.name.bn} <span className="text-fg-muted">/ {category.name.en}</span>
                </p>
                <p className="text-sm text-fg-muted">{t('settings.menu.itemCount', { count: countByCategory.get(category.id) ?? 0 })}</p>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
                <span className="text-sm text-fg-muted tabular-nums">#{format.number(category.sortOrder)}</span>
                <IconButton label={t('common.edit')} icon={<Pencil className="size-5" aria-hidden />} onClick={() => setEditing({ mode: 'open', value: category })} showTooltip={false} />
                <IconButton label={t('common.delete')} icon={<Trash className="size-5" aria-hidden />} variant="danger-soft" onClick={() => void remove(category)} showTooltip={false} />
              </div>
            </li>
          );
        })}
      </ul>
      {editing.mode === 'open' && <CategoryFormModal category={editing.value} onClose={() => setEditing({ mode: 'closed' })} />}
    </div>
  );
}

/** Menu items and categories (bilingual), availability, prices and images. */
export function MenuManagement() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('items');
  return (
    <SettingsSection
      title={t('settings.menu.title')}
      icon={<UtensilsCrossed className="size-5" aria-hidden />}
      actions={
        <SegmentedControl<Tab>
          label={t('settings.menu.title')}
          value={tab}
          onValueChange={setTab}
          size="sm"
          options={[
            { value: 'items', label: t('settings.menu.items') },
            { value: 'categories', label: t('settings.menu.categories') },
          ]}
        />
      }
    >
      {tab === 'items' ? <ItemsList /> : <CategoriesList />}
    </SettingsSection>
  );
}

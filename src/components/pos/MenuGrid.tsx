import { SearchX } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/common/EmptyState';
import { useFormatters } from '@/hooks/useFormatters';
import { addMenuItemToOrder } from '@/services/posActions';
import { useFilteredMenuItems, useMenuStore } from '@/store/menuStore';
import { useCartQuantities } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MenuItemCard } from './MenuItemCard';

export function MenuGrid() {
  const { t } = useTranslation();
  const format = useFormatters();
  const items = useFilteredMenuItems();
  const categories = useMenuStore((state) => state.categories);
  const quantities = useCartQuantities();
  const showImages = useSettingsStore((state) => state.settings.ui.showItemImages);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden />}
        title={t('pos.noItemsFound')}
        description={t('pos.noItemsFoundHint')}
        className="h-full"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-sm text-fg-muted" aria-live="polite">
        {t('pos.resultCount', { count: items.length })}
      </p>
      <div
        role="list"
        aria-label={t('a11y.menuItems')}
        className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(calc(10.5rem*var(--app-card-scale)),1fr))] content-start gap-3 overflow-y-auto pe-1 pb-4 compact:grid-cols-[repeat(auto-fill,minmax(calc(9rem*var(--app-card-scale)),1fr))] compact:gap-2"
      >
        {items.map((item) => (
          <div role="listitem" key={item.id} className="flex">
            <MenuItemCard
              item={item}
              category={categoryById.get(item.categoryId)}
              quantityInOrder={quantities.get(item.id) ?? 0}
              showImage={showImages}
              format={format}
              onAdd={addMenuItemToOrder}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

import { Pause } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MenuItemCard } from '@/components/pos/MenuItemCard';
import { TableCard } from '@/components/tables/TableCard';
import { useClock } from '@/hooks/useClock';
import { useFormatters } from '@/hooks/useFormatters';
import { useMenuStore } from '@/store/menuStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { DiningTable, Order } from '@/types';

const PREVIEW_ITEM_COUNT = 3;
const ignore = () => undefined;

/** A sample occupied table: 3 guests at a 4-seat table, seated 35 minutes ago. */
function createPreviewTable(): { table: DiningTable; order: Pick<Order, 'total' | 'items' | 'guests'> } {
  return {
    table: {
      id: 'preview-table',
      number: 5,
      name: '05',
      capacity: 4,
      status: 'occupied',
      statusSince: new Date(Date.now() - 35 * 60_000).toISOString(),
    },
    order: {
      total: 845,
      guests: 3,
      items: [{ id: 'preview-line', menuItemId: 'preview', name: { bn: 'নমুনা', en: 'Sample' }, price: 845, quantity: 4 }],
    },
  };
}

/**
 * A small, non-interactive sample of the POS drawn with the real components,
 * so text size, card size, accent color and density show exactly as they
 * will on the POS screen.
 */
export function AppearancePreview() {
  const { t } = useTranslation();
  const format = useFormatters();
  const items = useMenuStore((state) => state.items);
  const categories = useMenuStore((state) => state.categories);
  const restaurantName = useSettingsStore((state) => state.settings.name);
  const showImages = useSettingsStore((state) => state.settings.ui.showItemImages);
  const tableView = useSettingsStore((state) => state.settings.ui.tableView);
  const [preview] = useState(createPreviewTable);
  const now = useClock();

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const sample = useMemo(() => {
    const available = items.filter((item) => item.isAvailable);
    const withPhotos = available.filter((item) => item.image);
    return (withPhotos.length >= PREVIEW_ITEM_COUNT ? withPhotos : available).slice(0, PREVIEW_ITEM_COUNT);
  }, [items]);

  return (
    <div aria-hidden inert className="space-y-4 overflow-hidden rounded-card border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-lg font-bold">{format.text(restaurantName)}</p>
        <Badge tone="primary">{t('orderType.dine-in')}</Badge>
      </div>

      <div className="flex gap-3 overflow-hidden mask-[linear-gradient(to_right,black_80%,transparent)] compact:gap-2">
        {sample.map((item, index) => (
          <div key={item.id} className="flex w-[calc(10.5rem*var(--app-card-scale))] shrink-0 compact:w-[calc(9rem*var(--app-card-scale))]">
            <MenuItemCard
              item={item}
              category={categoryById.get(item.categoryId)}
              quantityInOrder={index === 0 ? 2 : 0}
              showImage={showImages}
              format={format}
              onAdd={ignore}
            />
          </div>
        ))}
      </div>

      <div className="w-[calc(12.5rem*var(--app-card-scale))] max-w-full">
        <TableCard table={preview.table} order={preview.order} format={format} onSelect={ignore} view={tableView} now={now} isCurrent />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Pause className="size-5" aria-hidden />}>
          {t('cart.hold')}
        </Button>
        <Button variant="primary" className="flex-1">
          {t('cart.payAndPrint')}
        </Button>
      </div>
    </div>
  );
}

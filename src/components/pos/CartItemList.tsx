import { ShoppingBasket } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/common/EmptyState';
import { useFormatters } from '@/hooks/useFormatters';
import { useMenuStore } from '@/store/menuStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { CartItem } from './CartItem';

export function CartItemList() {
  const { t } = useTranslation();
  const format = useFormatters();
  const items = usePosStore((state) => state.draft.items);
  const menuItems = useMenuStore((state) => state.items);
  const showImages = useSettingsStore((state) => state.settings.ui.showItemImages);
  const imageById = useMemo(() => {
    const images = new Map<string, string>();
    if (showImages) for (const item of menuItems) if (item.image) images.set(item.id, item.image);
    return images;
  }, [menuItems, showImages]);
  const endRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(items.length);

  // Keep the newest line in view when an item is added.
  useEffect(() => {
    if (items.length > previousCount.current) endRef.current?.scrollIntoView({ block: 'nearest' });
    previousCount.current = items.length;
  }, [items.length]);

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={<ShoppingBasket aria-hidden />}
        title={t('cart.empty')}
        description={t('cart.emptyHint')}
        className="min-h-0 flex-1"
      />
    );
  }

  return (
    <div className="@container min-h-0 flex-1 overflow-y-auto px-4 py-1 compact:px-3">
      <ul aria-label={t('cart.orderItems')} className="divide-y divide-border">
        {items.map((item) => (
          <CartItem key={item.id} item={item} format={format} image={imageById.get(item.menuItemId)} />
        ))}
      </ul>
      <div ref={endRef} />
    </div>
  );
}

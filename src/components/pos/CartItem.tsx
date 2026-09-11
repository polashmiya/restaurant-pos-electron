import { ChefHat, Minus, Plus, StickyNote, Trash } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { ItemImage } from '@/components/common/ItemImage';
import type { Formatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import type { OrderItem } from '@/types';
import { calculateLineTotal } from '@/utils/calculations';

export interface CartItemProps {
  item: OrderItem;
  format: Formatters;
  /** Menu photo thumbnail (when item images are enabled). */
  image?: string;
}

/** One cart line: name, unit price, quantity (+/−), subtotal, note, delete. */
export const CartItem = memo(function CartItem({ item, format, image }: CartItemProps) {
  const { t } = useTranslation();
  const name = format.text(item.name);
  const sent = item.sentToKitchen ?? 0;
  const unsent = Math.max(0, item.quantity - sent);
  const { incrementItem, decrementItem, removeItem } = usePosStore.getState();
  const openModal = useUIStore((state) => state.openModal);

  return (
    <li className="rounded-card border border-border bg-surface-2/60 p-3 compact:p-2.5">
      <div className="flex items-start gap-3">
        {image && (
          <ItemImage
            src={image}
            className="size-12 shrink-0 rounded-lg object-cover compact:size-10"
            fallback={null}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="leading-snug font-semibold">{name}</p>
          <p className="text-sm text-fg-muted tabular-nums">{t('cart.unitPrice', { price: format.currency(item.price) })}</p>
          {item.note && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-warning-text">
              <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="sr-only">{t('common.note')}:</span>
              {format.text(item.note)}
            </p>
          )}
          {sent > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-fg-subtle">
              <ChefHat className="size-3.5" aria-hidden />
              {unsent > 0 ? t('cart.newForKitchen', { count: unsent }) : t('cart.sentToKitchen')}
            </p>
          )}
        </div>
        <p className="shrink-0 text-base font-bold tabular-nums">{format.currency(calculateLineTotal(item))}</p>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div
          role="group"
          aria-label={t('cart.quantityOf', { name })}
          className="flex items-center rounded-control border border-border bg-surface"
        >
          <IconButton
            label={t('cart.decrease', { name })}
            icon={<Minus className="size-5" aria-hidden />}
            onClick={() => decrementItem(item.id)}
            disabled={item.quantity <= 1}
            showTooltip={false}
          />
          <span className="min-w-10 text-center text-lg font-bold tabular-nums" aria-live="polite">
            {format.number(item.quantity)}
          </span>
          <IconButton
            label={t('cart.increase', { name })}
            icon={<Plus className="size-5" aria-hidden />}
            onClick={() => incrementItem(item.id)}
            showTooltip={false}
          />
        </div>
        <Button
          variant="ghost"
          icon={<StickyNote className="size-4" aria-hidden />}
          onClick={() => openModal({ type: 'itemNote', lineId: item.id })}
          className="px-3"
        >
          {item.note ? t('cart.editNote') : t('cart.addNote')}
        </Button>
        <div className="flex-1" />
        <IconButton
          label={t('cart.remove', { name })}
          icon={<Trash className="size-5" aria-hidden />}
          variant="danger-soft"
          onClick={() => removeItem(item.id)}
          showTooltip={false}
        />
      </div>
    </li>
  );
});

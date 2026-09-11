import { ChefHat, Minus, Plus, StickyNote, Trash } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/common/IconButton';
import { ItemImage } from '@/components/common/ItemImage';
import type { Formatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import type { OrderItem } from '@/types';
import { calculateLineTotal } from '@/utils/calculations';
import { cn } from '@/utils/cn';

export interface CartItemProps {
  item: OrderItem;
  format: Formatters;
  /** Menu photo thumbnail (when item images are enabled; shown when the cart is wide enough). */
  image?: string;
}

/** Quantity buttons: 40 px (comfortable) / 36 px (compact density). */
const STEP_BUTTON = 'compact:size-9';

/**
 * One cart line in a single compact row, so many lines fit on screen:
 * − quantity + · name (unit price, kitchen status, note) · line total · note.
 * At quantity 1 the "−" button removes the line.
 */
export const CartItem = memo(function CartItem({ item, format, image }: CartItemProps) {
  const { t } = useTranslation();
  const name = format.text(item.name);
  const note = item.note ? format.text(item.note) : '';
  const sent = item.sentToKitchen ?? 0;
  const unsent = Math.max(0, item.quantity - sent);
  const kitchenStatus = unsent > 0 ? t('cart.newForKitchen', { count: unsent }) : t('cart.sentToKitchen');
  const { incrementItem, decrementItem, removeItem } = usePosStore.getState();
  const openModal = useUIStore((state) => state.openModal);

  return (
    <li className="flex items-center gap-2 py-2 compact:gap-1.5 compact:py-1">
      <div
        role="group"
        aria-label={t('cart.quantityOf', { name })}
        className="flex shrink-0 items-center rounded-control border border-border bg-surface"
      >
        {item.quantity > 1 ? (
          <IconButton
            label={t('cart.decrease', { name })}
            icon={<Minus className="size-4" aria-hidden />}
            size="sm"
            onClick={() => decrementItem(item.id)}
            showTooltip={false}
            className={STEP_BUTTON}
          />
        ) : (
          <IconButton
            label={t('cart.remove', { name })}
            icon={<Trash className="size-4" aria-hidden />}
            size="sm"
            variant="ghost-danger"
            onClick={() => removeItem(item.id)}
            showTooltip={false}
            className={STEP_BUTTON}
          />
        )}
        <span className="min-w-7 text-center font-bold tabular-nums" aria-live="polite">
          {format.number(item.quantity)}
        </span>
        <IconButton
          label={t('cart.increase', { name })}
          icon={<Plus className="size-4" aria-hidden />}
          size="sm"
          onClick={() => incrementItem(item.id)}
          showTooltip={false}
          className={STEP_BUTTON}
        />
      </div>

      {image && (
        <ItemImage src={image} className="hidden size-10 shrink-0 rounded-lg object-cover @[27rem]:block compact:size-9" fallback={null} />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate leading-tight font-semibold" title={name}>
          {name}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
          <span className="shrink-0 tabular-nums">{t('cart.unitPrice', { price: format.currency(item.price) })}</span>
          {sent > 0 && (
            <span
              className={cn('inline-flex shrink-0 items-center gap-0.5', unsent > 0 ? 'text-warning-text' : 'text-success-text')}
              title={kitchenStatus}
            >
              <ChefHat className="size-3.5" aria-hidden />
              {unsent > 0 ? `+${format.number(unsent)}` : '✓'}
              <span className="sr-only">{kitchenStatus}</span>
            </span>
          )}
          {note && (
            <span className="inline-flex min-w-0 items-center gap-1 text-warning-text" title={note}>
              <StickyNote className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t('common.note')}:</span>
              <span className="truncate">{note}</span>
            </span>
          )}
        </p>
      </div>

      <p className="shrink-0 font-bold tabular-nums">{format.currency(calculateLineTotal(item))}</p>

      <IconButton
        label={item.note ? t('cart.editNote') : t('cart.addNote')}
        icon={<StickyNote className={cn('size-4', item.note && 'text-warning-text')} aria-hidden />}
        size="sm"
        onClick={() => openModal({ type: 'itemNote', lineId: item.id })}
        showTooltip={false}
        className={STEP_BUTTON}
      />
    </li>
  );
});

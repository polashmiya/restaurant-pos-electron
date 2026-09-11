import { Ban } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ItemImage } from '@/components/common/ItemImage';
import type { Formatters } from '@/hooks/useFormatters';
import type { Category, MenuItem } from '@/types';
import { cn } from '@/utils/cn';
import { CATEGORY_ICONS, CATEGORY_TINTS, FALLBACK_CATEGORY_ICON } from './categoryVisuals';

export interface MenuItemCardProps {
  item: MenuItem;
  category: Category | undefined;
  quantityInOrder: number;
  showImage: boolean;
  format: Formatters;
  onAdd: (item: MenuItem) => void;
}

/**
 * Large touch card: image/placeholder, name, price, availability.
 * Memoized — only cards whose data or in-order quantity changed re-render.
 */
export const MenuItemCard = memo(function MenuItemCard({
  item,
  category,
  quantityInOrder,
  showImage,
  format,
  onAdd,
}: MenuItemCardProps) {
  const { t } = useTranslation();
  const name = format.text(item.name);
  const tint = CATEGORY_TINTS[category?.color ?? 'blue'];
  const Icon = (category && CATEGORY_ICONS[category.icon]) || FALLBACK_CATEGORY_ICON;
  const unavailable = !item.isAvailable;

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      aria-disabled={unavailable || undefined}
      aria-label={unavailable ? `${name} — ${t('pos.unavailable')}` : t('pos.addToOrder', { name })}
      className={cn(
        'group relative flex min-h-28 w-full flex-col overflow-hidden rounded-card border bg-surface text-start',
        'transition-[border-color,background-color,transform] duration-150',
        unavailable
          ? 'cursor-not-allowed border-border opacity-55 grayscale'
          : 'border-border hover:border-primary/60 hover:bg-surface-2 active:scale-[0.98]',
        quantityInOrder > 0 && !unavailable && 'border-primary/70 ring-1 ring-primary/40',
      )}
    >
      {showImage ? (
        <div className={cn('relative aspect-[16/10] w-full overflow-hidden compact:aspect-[16/8]', tint.surface)}>
          <ItemImage
            src={item.image}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            fallback={
              <span className="grid size-full place-items-center">
                <Icon className={cn('size-10 opacity-90 compact:size-8', tint.text)} aria-hidden />
              </span>
            }
          />
          {/* Category color keeps its role as a quick visual cue on photos too. */}
          <span aria-hidden className={cn('absolute inset-x-0 bottom-0 h-1', tint.strip)} />
        </div>
      ) : (
        <span aria-hidden className={cn('absolute inset-y-0 start-0 w-1.5', tint.strip)} />
      )}

      <div className={cn('flex flex-1 flex-col gap-1.5 p-3 compact:p-2.5', !showImage && 'ps-4')}>
        <p className="line-clamp-2 leading-snug font-semibold text-fg">{name}</p>
        <span className="mt-auto text-base font-bold whitespace-nowrap text-primary-text tabular-nums">
          {format.currency(item.price)}
        </span>
      </div>

      {unavailable && (
        <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-danger-fg shadow">
          <Ban className="size-3.5" aria-hidden />
          {t('pos.unavailable')}
        </span>
      )}

      {quantityInOrder > 0 && (
        <span
          className="absolute end-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-fg shadow-md"
          aria-label={t('pos.inOrder', { count: quantityInOrder })}
        >
          {format.number(quantityInOrder)}
        </span>
      )}
    </button>
  );
});

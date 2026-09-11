import { Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useCartTaxRate, useCartTotals, usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';

/**
 * Subtotal − discount + tax = total (all derived from the cart), in two
 * compact rows so the item list above keeps the space: the breakdown on one
 * small line, then the discount button and the large total.
 */
export function OrderSummary() {
  const { t } = useTranslation();
  const format = useFormatters();
  const totals = useCartTotals();
  const taxRate = useCartTaxRate();
  const discount = usePosStore((state) => state.draft.discountInput);
  const hasItems = usePosStore((state) => state.draft.items.length > 0);
  const openModal = useUIStore((state) => state.openModal);

  const discountLabel = discount
    ? discount.type === 'percentage'
      ? t('cart.discountPercent', { value: discount.value })
      : t('cart.discount')
    : t('cart.addDiscount');

  return (
    <div className="border-t border-border px-4 pt-2 pb-1 compact:px-3">
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
        <div className="flex items-center gap-1.5">
          <dt className="text-fg-muted">{t('cart.subtotal')}</dt>
          <dd className="font-medium tabular-nums">{format.currency(totals.subtotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex items-center gap-1.5">
            <dt className="text-fg-muted">{t('cart.discount')}</dt>
            <dd className="font-medium text-success-text tabular-nums">− {format.currency(totals.discount)}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt className="text-fg-muted">{taxRate !== null ? t('cart.tax', { rate: taxRate }) : t('cart.taxMixed')}</dt>
          <dd className="font-medium tabular-nums">{format.currency(totals.tax)}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => openModal({ type: 'discount' })}
          disabled={!hasItems}
          className="-ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary-text hover:bg-primary/10 disabled:text-fg-subtle disabled:hover:bg-transparent"
        >
          <Percent className="size-4" aria-hidden />
          {discountLabel}
        </button>
        <dl className="flex items-baseline gap-2">
          <dt className="text-lg font-bold">{t('cart.total')}</dt>
          <dd className="text-3xl font-extrabold tabular-nums compact:text-2xl">{format.currency(totals.total)}</dd>
        </dl>
      </div>
    </div>
  );
}

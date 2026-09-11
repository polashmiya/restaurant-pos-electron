import { Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { useCartTaxRate, useCartTotals, usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';

/** Subtotal − discount + tax = total (all derived from the cart). */
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
    <dl className="space-y-1 border-t border-border px-4 py-3 text-base compact:py-2">
      <div className="flex items-center justify-between">
        <dt className="text-fg-muted">{t('cart.subtotal')}</dt>
        <dd className="font-medium tabular-nums">{format.currency(totals.subtotal)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt>
          <button
            type="button"
            onClick={() => openModal({ type: 'discount' })}
            disabled={!hasItems}
            className="-ms-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium text-primary-text hover:bg-primary/10 disabled:text-fg-subtle disabled:hover:bg-transparent"
          >
            <Percent className="size-4" aria-hidden />
            {discountLabel}
          </button>
        </dt>
        <dd className={totals.discount > 0 ? 'font-medium text-success-text tabular-nums' : 'text-fg-muted tabular-nums'}>
          {totals.discount > 0 ? `− ${format.currency(totals.discount)}` : format.currency(0)}
        </dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-fg-muted">{taxRate !== null ? t('cart.tax', { rate: taxRate }) : t('cart.taxMixed')}</dt>
        <dd className="font-medium tabular-nums">{format.currency(totals.tax)}</dd>
      </div>
      <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-border-strong pt-2">
        <dt className="text-lg font-bold">{t('cart.total')}</dt>
        <dd className="text-3xl font-extrabold tabular-nums compact:text-2xl">{format.currency(totals.total)}</dd>
      </div>
    </dl>
  );
}

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { useCartTotals, usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { DiscountType } from '@/types';
import { calculateDiscount, calculateOrderTotals } from '@/utils/calculations';
import { cn } from '@/utils/cn';
import { validateDiscount } from '@/utils/validation';

/** Fixed or percentage discount with live preview (master spec §29). */
export function DiscountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const current = usePosStore((state) => state.draft.discountInput);
  const items = usePosStore((state) => state.draft.items);
  const setDiscount = usePosStore((state) => state.setDiscount);
  const taxRate = useSettingsStore((state) => state.settings.defaultTaxRate);
  const totals = useCartTotals();

  const [type, setType] = useState<DiscountType>(current?.type ?? 'percentage');
  const [value, setValue] = useState<number | null>(current?.value ?? null);

  const input = value !== null && value > 0 ? { type, value } : undefined;
  const errorKey = value !== null ? validateDiscount(totals.subtotal, { type, value }) : null;
  const discountAmount = calculateDiscount(totals.subtotal, input);
  const preview = calculateOrderTotals(items, input, taxRate);

  const apply = (event?: FormEvent) => {
    event?.preventDefault();
    if (errorKey) return;
    if (!input) {
      setDiscount(undefined);
      if (current) toast.info(message('discount.removed'));
    } else {
      setDiscount(input);
      toast.success(message('discount.applied'));
    }
    onClose();
  };

  const remove = () => {
    setDiscount(undefined);
    toast.info(message('discount.removed'));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('discount.title')}
      description={t('discount.subtotalLabel', { amount: format.currency(totals.subtotal) })}
      size="sm"
      footer={
        <>
          {current && (
            <Button variant="danger-soft" onClick={remove} className="me-auto">
              {t('discount.remove')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => apply()} disabled={Boolean(errorKey)}>
            {t('discount.apply')}
          </Button>
        </>
      }
    >
      <form onSubmit={apply} className="space-y-4">
        <SegmentedControl<DiscountType>
          label={t('discount.type')}
          value={type}
          onValueChange={(next) => {
            setType(next);
            setValue(null);
          }}
          fullWidth
          options={[
            { value: 'percentage', label: `% ${t('discount.percentage')}` },
            { value: 'fixed', label: `${format.context.currencySymbol} ${t('discount.fixed')}` },
          ]}
        />

        <NumberInput
          label={t('discount.value')}
          value={value}
          onValueChange={setValue}
          size="xl"
          prefix={type === 'fixed' ? format.context.currencySymbol : undefined}
          suffix={type === 'percentage' ? '%' : undefined}
          error={errorKey ? t(errorKey) : undefined}
          data-autofocus
        />

        {type === 'percentage' && (
          <div role="group" aria-label={t('discount.presets')} className="grid grid-cols-4 gap-2">
            {APP_CONFIG.payment.discountPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue(preset)}
                aria-pressed={value === preset}
                className={cn(
                  'min-h-touch rounded-control border text-base font-bold transition-colors',
                  value === preset
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border bg-surface-2 hover:bg-surface-3',
                )}
              >
                {format.percent(preset)}
              </button>
            ))}
          </div>
        )}

        <dl className="space-y-1 rounded-card bg-surface-2 p-4">
          <div className="flex justify-between">
            <dt className="text-fg-muted">{t('discount.amount')}</dt>
            <dd className="font-bold text-success-text tabular-nums">− {format.currency(discountAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">{t('cart.total')}</dt>
            <dd className="text-lg font-bold tabular-nums">{format.currency(preview.total)}</dd>
          </div>
        </dl>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

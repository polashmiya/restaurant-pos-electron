import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PaymentMethod } from '@/types';
import { cn } from '@/utils/cn';

const METHODS: { value: PaymentMethod; icon: typeof Banknote }[] = [
  { value: 'cash', icon: Banknote },
  { value: 'card', icon: CreditCard },
  { value: 'mobile', icon: Smartphone },
];

export function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('payment.method')} className="grid grid-cols-3 gap-2">
      {METHODS.map(({ value: method, icon: Icon }) => {
        const selected = value === method;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(method)}
            className={cn(
              'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-card border-2 px-2 text-base font-bold transition-colors',
              'disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/15 text-primary-text'
                : 'border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-surface-3',
            )}
          >
            <Icon className="size-7" aria-hidden />
            {t(`paymentMethod.${method}`)}
          </button>
        );
      })}
    </div>
  );
}

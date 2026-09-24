import { useTranslation } from 'react-i18next';
import { controlClassName } from '@/components/common/styles';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { calculateChange, isCashSufficient } from '@/utils/calculations';
import { cn } from '@/utils/cn';
import { amountFromText, sanitizeAmountText } from '@/utils/keypad';
import { fromMinor, toMinor } from '@/utils/money';

export interface CashPaymentPanelProps {
  total: number;
  amountText: string;
  onAmountTextChange: (text: string) => void;
  disabled?: boolean;
}

/** Amount received, quick cash buttons, exact change and live change. */
export function CashPaymentPanel({ total, amountText, onAmountTextChange, disabled = false }: CashPaymentPanelProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const amount = amountFromText(amountText);
  const sufficient = amount !== null && isCashSufficient(total, amount);
  const change = amount !== null ? calculateChange(total, amount) : 0;
  const stillDue = amount !== null ? fromMinor(Math.max(0, toMinor(total) - toMinor(amount))) : total;

  const quickButton = (label: string, value: number, key: string) => {
    const selected = amount !== null && toMinor(amount) === toMinor(value);
    const tooSmall = toMinor(value) < toMinor(total);
    return (
      <button
        key={key}
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => onAmountTextChange(String(value))}
        className={cn(
          'min-h-14 rounded-control border-2 px-2 text-base font-bold tabular-nums transition-colors disabled:opacity-50',
          selected
            ? 'border-primary bg-primary text-primary-fg'
            : tooSmall
              ? 'border-border bg-surface-2 text-fg-subtle hover:bg-surface-3'
              : 'border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-surface-3',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="payment-amount" className="text-sm font-semibold">
          {t('payment.amountReceived')}
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute start-4 text-xl font-bold text-fg-muted sm:text-2xl" aria-hidden>
            {format.context.currencySymbol}
          </span>
          <input
            id="payment-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(event) => onAmountTextChange(sanitizeAmountText(event.target.value))}
            disabled={disabled}
            aria-invalid={amount !== null && !sufficient ? true : undefined}
            aria-describedby="payment-change"
            className={cn(controlClassName, 'min-h-14 ps-11 text-2xl font-bold tabular-nums sm:min-h-16 sm:ps-12 sm:text-3xl')}
            data-autofocus
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">{t('payment.quickCash')}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {APP_CONFIG.payment.quickCashAmounts.map((value) => quickButton(format.currencyShort(value), value, String(value)))}
          {quickButton(t('payment.exact'), total, 'exact')}
        </div>
      </div>

      <div
        id="payment-change"
        aria-live="polite"
        className={cn(
          'flex min-h-20 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card border-2 px-4 py-3 sm:px-5',
          amount === null
            ? 'border-border bg-surface-2'
            : sufficient
              ? 'border-success/50 bg-success/10'
              : 'border-danger/60 bg-danger/10',
        )}
      >
        {amount !== null && !sufficient ? (
          <>
            <p className="text-lg font-bold text-danger-text" role="alert">
              {t('payment.insufficient')}
            </p>
            <p className="text-base font-semibold text-danger-text tabular-nums">
              {t('payment.remaining', { amount: format.currency(stillDue) })}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-fg-muted">{t('payment.change')}</p>
            <p className={cn('text-3xl font-extrabold break-words tabular-nums sm:text-4xl', amount !== null && 'text-success-text')}>
              {amount === null ? '—' : format.currency(change)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

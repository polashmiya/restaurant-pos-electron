import { CircleCheckBig, CreditCard, Smartphone } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useFormatters } from '@/hooks/useFormatters';
import { submitPayment } from '@/services/posActions';
import { useCartTaxRate, useCartTotals, usePosStore } from '@/store/posStore';
import { useTableStore } from '@/store/tableStore';
import type { PaymentMethod } from '@/types';
import { applyKeypadKey, amountFromText } from '@/utils/keypad';
import { validatePayment } from '@/utils/validation';
import { CashPaymentPanel } from './CashPaymentPanel';
import { NumericKeypad } from './NumericKeypad';
import { PaymentMethodSelector } from './PaymentMethodSelector';

/**
 * Payment dialog (master spec §30–§32, §93): total due, method, cash with
 * quick amounts / exact change / keypad and live change, validation and
 * duplicate-payment protection (the complete button locks while saving).
 */
export function PaymentModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const totals = useCartTotals();
  const taxRate = useCartTaxRate();
  const orderType = usePosStore((state) => state.draft.orderType);
  const orderNumber = usePosStore((state) => state.draft.orderNumber);
  const tableId = usePosStore((state) => state.draft.tableId);
  const tableName = useTableStore((state) => state.tables.find((table) => table.id === tableId)?.name);
  const processing = usePosStore((state) => state.isProcessingPayment);

  const [method, setMethod] = useState<PaymentMethod | null>('cash');
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');

  const amount = amountFromText(amountText);
  const paymentIssue = validatePayment({
    method,
    total: totals.total,
    amountReceived: method === 'cash' ? amount : totals.total,
  });
  const canComplete = !processing && paymentIssue === null && totals.itemCount > 0;

  const complete = async () => {
    if (!canComplete || !method) return;
    await submitPayment({
      method,
      amountReceived: method === 'cash' ? amount : null,
      ...(reference.trim() ? { reference: reference.trim() } : {}),
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && (event.target as HTMLElement).tagName !== 'BUTTON') {
      event.preventDefault();
      void complete();
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('payment.title')}
      description={orderNumber}
      size="lg"
      dismissible={!processing}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose} disabled={processing}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="success"
            size="lg"
            onClick={() => void complete()}
            disabled={!canComplete}
            loading={processing}
            icon={processing ? undefined : <CircleCheckBig className="size-5" aria-hidden />}
            className="sm:min-w-56"
          >
            {processing ? t('payment.processing') : t('payment.complete')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-[minmax(0,1fr)_16rem]" onKeyDown={handleKeyDown}>
        <div className="space-y-4">
          <div className="rounded-card border-2 border-primary/40 bg-primary/10 px-4 py-3 text-center sm:px-5 sm:py-4">
            <p className="text-sm font-semibold tracking-wide text-fg-muted uppercase">{t('payment.totalDue')}</p>
            <p className="text-4xl font-extrabold break-words tabular-nums sm:text-5xl" aria-live="polite">
              {format.currency(totals.total)}
            </p>
          </div>

          <PaymentMethodSelector value={method} onChange={setMethod} disabled={processing} />

          {method === 'cash' && (
            <CashPaymentPanel
              total={totals.total}
              amountText={amountText}
              onAmountTextChange={setAmountText}
              disabled={processing}
            />
          )}

          {(method === 'card' || method === 'mobile') && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-card border border-info/40 bg-info/10 p-4">
                {method === 'card' ? (
                  <CreditCard className="mt-0.5 size-5 shrink-0 text-info-text" aria-hidden />
                ) : (
                  <Smartphone className="mt-0.5 size-5 shrink-0 text-info-text" aria-hidden />
                )}
                <p>
                  {t(method === 'card' ? 'payment.cardHint' : 'payment.mobileHint', {
                    amount: format.currency(totals.total),
                  })}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-card bg-surface-2 p-3 sm:p-4">
                  <dt className="text-sm text-fg-muted">{t('payment.paid')}</dt>
                  <dd className="text-xl font-bold break-words tabular-nums sm:text-2xl">{format.currency(totals.total)}</dd>
                </div>
                <div className="min-w-0 rounded-card bg-surface-2 p-3 sm:p-4">
                  <dt className="text-sm text-fg-muted">{t('payment.change')}</dt>
                  <dd className="text-xl font-bold break-words tabular-nums sm:text-2xl">{format.currency(0)}</dd>
                </div>
              </dl>
              <Input
                label={t('payment.reference')}
                placeholder={t('payment.referencePlaceholder')}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={60}
                disabled={processing}
              />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {method === 'cash' && (
            <NumericKeypad
              onKey={(key) => setAmountText((previous) => applyKeypadKey(previous, key))}
              onClear={() => setAmountText('')}
              disabled={processing}
            />
          )}
          <section aria-label={t('payment.summary')} className="rounded-card border border-border bg-surface-2/60 p-4 text-sm">
            <p className="mb-2 font-semibold">
              {t(`orderType.${orderType}`)}
              {tableName && ` · ${t('tables.tableName', { name: format.digits(tableName) })}`}
            </p>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-fg-muted">{t('common.items')}</dt>
                <dd className="tabular-nums">{format.number(totals.itemCount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-fg-muted">{t('cart.subtotal')}</dt>
                <dd className="tabular-nums">{format.currency(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-muted">{t('cart.discount')}</dt>
                  <dd className="text-success-text tabular-nums">− {format.currency(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-fg-muted">{taxRate !== null ? t('cart.tax', { rate: taxRate }) : t('cart.taxMixed')}</dt>
                <dd className="tabular-nums">{format.currency(totals.tax)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </Modal>
  );
}

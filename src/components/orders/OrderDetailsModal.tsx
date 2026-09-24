import { ChefHat, Lock, Play, Printer } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { LANGUAGES } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { resumeOrder } from '@/services/posActions';
import { useOrder } from '@/store/orderStore';
import { useUIStore } from '@/store/uiStore';
import { calculateLineTotal, getUniformTaxRate } from '@/utils/calculations';
import { OrderStatusBadge } from './OrderStatusBadge';

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-end font-medium selectable">{children}</dd>
    </div>
  );
}

/** Read-only order details (master spec §39) with reprint actions. */
export function OrderDetailsModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const order = useOrder(orderId);
  const openModal = useUIStore((state) => state.openModal);
  const closeAllModals = useUIStore((state) => state.closeAllModals);
  const navigate = useUIStore((state) => state.navigate);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!order) onClose();
  }, [order, onClose]);

  if (!order) return null;

  const isOpenOrder = order.status === 'draft' || order.status === 'held';
  const taxRate = getUniformTaxRate(order.items, order.taxRate);
  const languageName = LANGUAGES.find((language) => language.code === order.language)?.nativeName ?? order.language;

  const openInPos = async () => {
    setOpening(true);
    const ok = await resumeOrder(order.id);
    setOpening(false);
    if (ok) {
      closeAllModals();
      navigate('pos');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('orders.details')}
      description={order.orderNumber}
      size="lg"
      headerActions={<OrderStatusBadge status={order.status} size="md" />}
      footer={
        isOpenOrder ? (
          <Button variant="primary" size="lg" icon={<Play className="size-5" aria-hidden />} onClick={() => void openInPos()} loading={opening}>
            {t('orders.openInPos')}
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              icon={<ChefHat className="size-5" aria-hidden />}
              onClick={() => openModal({ type: 'printPreview', orderId: order.id, document: 'kot' })}
            >
              {t('orders.printKot')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={<Printer className="size-5" aria-hidden />}
              onClick={() => openModal({ type: 'printPreview', orderId: order.id, document: 'receipt' })}
            >
              {t('orders.reprintReceipt')}
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label={t('common.items')} className="space-y-2">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs text-fg-muted uppercase">
              <tr>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t('common.item')}
                </th>
                <th scope="col" className="py-2 text-center font-semibold">
                  {t('common.qty')}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {t('common.price')}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {t('common.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border/60 align-top">
                  <td className="py-2">
                    <p className="font-semibold">{format.text(item.name)}</p>
                    {item.note && <p className="text-warning-text">{format.text(item.note)}</p>}
                  </td>
                  <td className="py-2 text-center tabular-nums">{format.number(item.quantity)}</td>
                  <td className="py-2 text-end tabular-nums">{format.currency(item.price)}</td>
                  <td className="py-2 text-end font-semibold tabular-nums">{format.currency(calculateLineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ms-auto max-w-sm space-y-0.5 pt-2 text-sm">
            <InfoRow label={t('cart.subtotal')}>{format.currency(order.subtotal)}</InfoRow>
            {order.discount > 0 && (
              <InfoRow
                label={
                  order.discountInput?.type === 'percentage'
                    ? t('cart.discountPercent', { value: order.discountInput.value })
                    : t('cart.discount')
                }
              >
                − {format.currency(order.discount)}
              </InfoRow>
            )}
            <InfoRow label={taxRate !== null ? t('cart.tax', { rate: taxRate }) : t('cart.taxMixed')}>
              {format.currency(order.tax)}
            </InfoRow>
            <div className="flex justify-between gap-4 border-t border-border pt-2 text-lg font-extrabold">
              <dt>{t('cart.total')}</dt>
              <dd className="tabular-nums">{format.currency(order.total)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <section aria-label={t('orders.information')} className="rounded-card bg-surface-2 p-4 text-sm">
            <h3 className="mb-2 font-bold">{t('orders.information')}</h3>
            <dl>
              <InfoRow label={t('orders.createdAt')}>{format.dateTime(order.createdAt)}</InfoRow>
              {order.completedAt && <InfoRow label={t('orders.completedAt')}>{format.dateTime(order.completedAt)}</InfoRow>}
              {order.cancelledAt && <InfoRow label={t('orders.cancelledAt')}>{format.dateTime(order.cancelledAt)}</InfoRow>}
              <InfoRow label={t('orderType.label')}>{t(`orderType.${order.orderType}`)}</InfoRow>
              {order.tableName && <InfoRow label={t('cart.table')}>{format.digits(order.tableName)}</InfoRow>}
              {order.cashierName && <InfoRow label={t('orders.cashier')}>{order.cashierName}</InfoRow>}
              <InfoRow label={t('print.receiptLanguage')}>{languageName}</InfoRow>
            </dl>
          </section>

          {order.customer && (
            <section aria-label={t('cart.customer')} className="rounded-card bg-surface-2 p-4 text-sm">
              <h3 className="mb-2 font-bold">{t('cart.customer')}</h3>
              <dl>
                <InfoRow label={t('common.name')}>{order.customer.name}</InfoRow>
                <InfoRow label={t('common.phone')}>{format.digits(order.customer.phone)}</InfoRow>
                {order.customer.address && <InfoRow label={t('common.address')}>{order.customer.address}</InfoRow>}
              </dl>
            </section>
          )}

          {order.payment && (
            <section aria-label={t('paymentMethod.label')} className="rounded-card bg-surface-2 p-4 text-sm">
              <h3 className="mb-2 font-bold">{t('paymentMethod.label')}</h3>
              <dl>
                <InfoRow label={t('paymentMethod.label')}>{t(`paymentMethod.${order.payment.method}`)}</InfoRow>
                <InfoRow label={t('payment.paid')}>{format.currency(order.payment.amountPaid)}</InfoRow>
                <InfoRow label={t('payment.change')}>{format.currency(order.payment.change)}</InfoRow>
                {order.payment.reference && <InfoRow label={t('orders.reference')}>{order.payment.reference}</InfoRow>}
              </dl>
            </section>
          )}

          {!isOpenOrder && (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Lock className="size-4 shrink-0" aria-hidden />
              {t('orders.readOnly')}
            </p>
          )}
        </aside>
      </div>
    </Modal>
  );
}

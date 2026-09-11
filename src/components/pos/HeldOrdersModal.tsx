import { Clock, Pause, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { useFormatters } from '@/hooks/useFormatters';
import { resumeOrder } from '@/services/posActions';
import { useHeldOrders } from '@/store/orderStore';

/** Held orders with a one-tap resume (master spec §60). */
export function HeldOrdersModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const heldOrders = useHeldOrders();
  const [resumingId, setResumingId] = useState<string | null>(null);

  const resume = async (orderId: string) => {
    setResumingId(orderId);
    try {
      if (await resumeOrder(orderId)) onClose();
    } finally {
      setResumingId(null);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('heldOrders.title')} size="md" dismissible={resumingId === null}>
      {heldOrders.length === 0 ? (
        <EmptyState icon={<Pause aria-hidden />} title={t('heldOrders.empty')} description={t('heldOrders.emptyHint')} />
      ) : (
        <ul className="space-y-2">
          {heldOrders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id} className="flex items-center gap-4 rounded-card border border-border bg-surface-2/60 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold selectable">{order.orderNumber}</p>
                  <p className="text-sm text-fg-muted">
                    {t(`orderType.${order.orderType}`)}
                    {order.tableName && ` · ${t('tables.tableName', { name: format.digits(order.tableName) })}`}
                    {' · '}
                    {t('common.itemCount', { count: itemCount })}
                  </p>
                  {order.heldAt && (
                    <p className="flex items-center gap-1 text-sm text-fg-subtle">
                      <Clock className="size-3.5" aria-hidden />
                      {t('heldOrders.heldAt', { time: format.time(order.heldAt) })}
                    </p>
                  )}
                </div>
                <p className="text-lg font-bold tabular-nums">{format.currency(order.total)}</p>
                <Button
                  variant="primary"
                  icon={<Play className="size-4" aria-hidden />}
                  onClick={() => void resume(order.id)}
                  loading={resumingId === order.id}
                  disabled={resumingId !== null && resumingId !== order.id}
                  aria-label={t('heldOrders.resumeOrder', { number: order.orderNumber })}
                >
                  {t('heldOrders.resume')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

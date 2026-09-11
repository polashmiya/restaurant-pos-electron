import { ClipboardList, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { useFormatters } from '@/hooks/useFormatters';
import { resumeOrder } from '@/services/posActions';
import { useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import { OrderStatusBadge } from './OrderStatusBadge';

/** Orders in progress (table orders, current order) and held orders. */
export function ActiveOrders() {
  const { t } = useTranslation();
  const format = useFormatters();
  const openOrders = useOrderStore((state) => state.openOrders);
  const currentOrderId = usePosStore((state) => state.draft.id);
  const navigate = useUIStore((state) => state.navigate);
  const openModal = useUIStore((state) => state.openModal);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const orders = useMemo(() => [...openOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [openOrders]);

  const open = async (orderId: string) => {
    if (orderId === currentOrderId) {
      navigate('pos');
      return;
    }
    setOpeningId(orderId);
    try {
      if (await resumeOrder(orderId)) navigate('pos');
    } finally {
      setOpeningId(null);
    }
  };

  if (orders.length === 0) {
    return (
      <EmptyState icon={<ClipboardList aria-hidden />} title={t('orders.noActiveOrders')} description={t('orders.noActiveOrdersHint')} />
    );
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {orders.map((order) => {
        const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const isCurrent = order.id === currentOrderId;
        return (
          <li key={order.id} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => openModal({ type: 'orderDetails', orderId: order.id })}
                className="min-w-0 text-start hover:underline"
              >
                <p className="font-bold selectable">{order.orderNumber}</p>
                <p className="text-sm text-fg-muted">
                  {t(`orderType.${order.orderType}`)}
                  {order.tableName && ` · ${t('tables.tableName', { name: format.digits(order.tableName) })}`}
                </p>
              </button>
              <div className="flex flex-col items-end gap-1">
                <OrderStatusBadge status={order.status} />
                {isCurrent && <Badge tone="primary">{t('orders.inProgress')}</Badge>}
              </div>
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="text-sm text-fg-muted">
                <p>{t('common.itemCount', { count: itemCount })}</p>
                <p>{format.time(order.heldAt ?? order.updatedAt)}</p>
              </div>
              <p className="text-xl font-extrabold tabular-nums">{format.currency(order.total)}</p>
            </div>
            <Button
              variant={isCurrent ? 'secondary' : 'primary'}
              icon={<Play className="size-4" aria-hidden />}
              onClick={() => void open(order.id)}
              loading={openingId === order.id}
              disabled={openingId !== null && openingId !== order.id}
            >
              {t('orders.openInPos')}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

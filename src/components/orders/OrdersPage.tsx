import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useFormatters } from '@/hooks/useFormatters';
import { useOrderStore } from '@/store/orderStore';
import { ActiveOrders } from './ActiveOrders';
import { OrderHistory } from './OrderHistory';

type OrdersTab = 'history' | 'active';

/** Orders (F3): history with reprint, plus active/held orders. */
export function OrdersPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const [tab, setTab] = useState<OrdersTab>('history');
  const activeCount = useOrderStore((state) => state.openOrders.length);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('orders.title')}
        actions={
          <SegmentedControl<OrdersTab>
            label={t('orders.title')}
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'history', label: t('orders.history') },
              { value: 'active', label: `${t('orders.active')} (${format.number(activeCount)})` },
            ]}
          />
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{tab === 'history' ? <OrderHistory /> : <ActiveOrders />}</div>
    </div>
  );
}

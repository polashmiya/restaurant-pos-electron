import { Eye, ReceiptText, SearchX } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { useOrderHistory } from '@/store/orderStore';
import { useUIStore } from '@/store/uiStore';
import {
  buildOrderSearchText,
  DEFAULT_HISTORY_FILTERS,
  filterOrderHistory,
  getOrderTimestamp,
  summarizeOrders,
  type OrderHistoryFilters,
} from '@/utils/orderFilters';
import { OrderFiltersBar } from './OrderFiltersBar';
import { OrderStatusBadge } from './OrderStatusBadge';

/** Completed and cancelled orders with search, filters and paging. */
export function OrderHistory() {
  const { t } = useTranslation();
  const format = useFormatters();
  const orders = useOrderHistory();
  const openModal = useUIStore((state) => state.openModal);
  const [filters, setFilters] = useState<OrderHistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [visibleCount, setVisibleCount] = useState<number>(APP_CONFIG.ui.orderHistoryPageSize);
  const deferredFilters = useDeferredValue(filters);

  const searchIndex = useMemo(() => new Map(orders.map((order) => [order.id, buildOrderSearchText(order)])), [orders]);
  const filtered = useMemo(
    () => filterOrderHistory(orders, deferredFilters, new Date(), searchIndex),
    [orders, deferredFilters, searchIndex],
  );
  const summary = useMemo(() => summarizeOrders(filtered), [filtered]);
  const visible = filtered.slice(0, visibleCount);

  const changeFilters = (next: OrderHistoryFilters) => {
    setFilters(next);
    setVisibleCount(APP_CONFIG.ui.orderHistoryPageSize);
  };

  const isDefaultToday =
    filters.range === 'today' && !filters.query && filters.status === 'all' && filters.orderType === 'all' && filters.payment === 'all';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <OrderFiltersBar filters={filters} onChange={changeFilters} />
      <p className="text-sm font-medium text-fg-muted" aria-live="polite">
        {t('orders.resultSummary', { count: summary.count, total: format.currency(summary.total) })}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={isDefaultToday ? <ReceiptText aria-hidden /> : <SearchX aria-hidden />}
          title={isDefaultToday ? t('orders.noOrdersToday') : t('orders.noOrders')}
          description={isDefaultToday ? undefined : t('orders.noOrdersHint')}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-card border border-border bg-surface">
          {/* Phones and small tablets: one card per order. The full table needs
              more width than they have, so it only appears from `lg` up. */}
          <ul aria-label={t('orders.history')} className="divide-y divide-border lg:hidden">
            {visible.map((order) => {
              const stamp = getOrderTimestamp(order);
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => openModal({ type: 'orderDetails', orderId: order.id })}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-start transition-colors hover:bg-surface-2"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold">{order.orderNumber}</span>
                      <span className="font-bold tabular-nums">{format.currency(order.total)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
                      <span className="tabular-nums">
                        {format.date(stamp)} · {format.time(stamp)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{t(`orderType.${order.orderType}`)}</span>
                      {order.tableName && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{t('tables.tableName', { name: format.digits(order.tableName) })}</span>
                        </>
                      )}
                      {order.payment && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{t(`paymentMethod.${order.payment.method}`)}</span>
                        </>
                      )}
                      <OrderStatusBadge status={order.status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <table className="hidden w-full min-w-[56rem] text-start text-sm lg:table">
            <thead className="sticky top-0 z-10 bg-surface-2 text-xs tracking-wide text-fg-muted uppercase">
              <tr>
                {(['orderId', 'date', 'time', 'type', 'table', 'payment'] as const).map((column) => (
                  <th key={column} scope="col" className="px-4 py-3 text-start font-semibold">
                    {t(`orders.columns.${column}`)}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  {t('orders.columns.total')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t('orders.columns.status')}
                </th>
                <th scope="col" className="px-2 py-3">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const stamp = getOrderTimestamp(order);
                return (
                  <tr
                    key={order.id}
                    onClick={() => openModal({ type: 'orderDetails', orderId: order.id })}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-2"
                  >
                    <td className="px-4 py-2.5 font-semibold selectable">{order.orderNumber}</td>
                    <td className="px-4 py-2.5 tabular-nums">{format.date(stamp)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{format.time(stamp)}</td>
                    <td className="px-4 py-2.5">{t(`orderType.${order.orderType}`)}</td>
                    <td className="px-4 py-2.5">{order.tableName ? format.digits(order.tableName) : '—'}</td>
                    <td className="px-4 py-2.5">{order.payment ? t(`paymentMethod.${order.payment.method}`) : '—'}</td>
                    <td className="px-4 py-2.5 text-end font-bold tabular-nums">{format.currency(order.total)}</td>
                    <td className="px-4 py-2.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-2 py-1">
                      <IconButton
                        label={`${t('common.view')} ${order.orderNumber}`}
                        icon={<Eye className="size-5" aria-hidden />}
                        onClick={(event) => {
                          event.stopPropagation();
                          openModal({ type: 'orderDetails', orderId: order.id });
                        }}
                        showTooltip={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > visible.length && (
            <div className="flex justify-center border-t border-border p-3">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((count) => count + APP_CONFIG.ui.orderHistoryPageSize)}
              >
                {t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/components/common/SearchInput';
import { Select } from '@/components/common/Select';
import type { OrderType, PaymentMethod } from '@/types';
import type { DateRangeFilter, HistoryStatusFilter, OrderHistoryFilters } from '@/utils/orderFilters';

const RANGES: DateRangeFilter[] = ['today', 'yesterday', 'last7', 'last30', 'all'];
const ORDER_TYPES: OrderType[] = ['dine-in', 'takeaway', 'delivery'];
const PAYMENTS: PaymentMethod[] = ['cash', 'card', 'mobile'];

export function OrderFiltersBar({
  filters,
  onChange,
}: {
  filters: OrderHistoryFilters;
  onChange: (filters: OrderHistoryFilters) => void;
}) {
  const { t } = useTranslation();
  const update = <K extends keyof OrderHistoryFilters>(key: K, value: OrderHistoryFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    // One column on phones, two on small tablets, then the single filter row.
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-[minmax(16rem,1.6fr)_repeat(4,minmax(9rem,1fr))]">
      <SearchInput
        value={filters.query}
        onValueChange={(value) => update('query', value)}
        label={t('common.search')}
        placeholder={t('orders.searchPlaceholder')}
        className="sm:col-span-2 lg:col-span-1"
      />
      <Select<DateRangeFilter>
        aria-label={t('orders.dateRange')}
        value={filters.range}
        onValueChange={(value) => update('range', value)}
        options={RANGES.map((range) => ({ value: range, label: t(`orders.range.${range}`) }))}
      />
      <Select<HistoryStatusFilter>
        aria-label={t('orders.statusFilter')}
        value={filters.status}
        onValueChange={(value) => update('status', value)}
        options={[
          { value: 'all', label: t('orders.allStatuses') },
          { value: 'completed', label: t('orderStatus.completed') },
          { value: 'cancelled', label: t('orderStatus.cancelled') },
        ]}
      />
      <Select<'all' | OrderType>
        aria-label={t('orders.typeFilter')}
        value={filters.orderType}
        onValueChange={(value) => update('orderType', value)}
        options={[
          { value: 'all', label: t('orders.allTypes') },
          ...ORDER_TYPES.map((type) => ({ value: type, label: t(`orderType.${type}`) })),
        ]}
      />
      <Select<'all' | PaymentMethod>
        aria-label={t('orders.paymentFilter')}
        value={filters.payment}
        onValueChange={(value) => update('payment', value)}
        options={[
          { value: 'all', label: t('orders.allPayments') },
          ...PAYMENTS.map((method) => ({ value: method, label: t(`paymentMethod.${method}`) })),
        ]}
      />
    </div>
  );
}

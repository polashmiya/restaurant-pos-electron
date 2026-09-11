import { EllipsisVertical, LayoutGrid } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { useClock } from '@/hooks/useClock';
import { useFormatters } from '@/hooks/useFormatters';
import { handleTableTap } from '@/services/tableActions';
import { useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTableStore } from '@/store/tableStore';
import { useUIStore } from '@/store/uiStore';
import { TableCard } from './TableCard';
import type { TableFilter } from './TableStatusFilter';

export function TableGrid({ filter }: { filter: TableFilter }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const tables = useTableStore((state) => state.tables);
  const openOrders = useOrderStore((state) => state.openOrders);
  const currentTableId = usePosStore((state) => state.draft.tableId);
  const openModal = useUIStore((state) => state.openModal);
  const view = useSettingsStore((state) => state.settings.ui.tableView);
  const now = useClock();

  const orderById = useMemo(() => new Map(openOrders.map((order) => [order.id, order])), [openOrders]);
  const visible = useMemo(
    () => (filter === 'all' ? tables : tables.filter((table) => table.status === filter)),
    [tables, filter],
  );

  if (tables.length === 0) {
    return <EmptyState icon={<LayoutGrid aria-hidden />} title={t('tables.noTables')} description={t('tables.noTablesHint')} />;
  }

  return (
    <ul
      aria-label={t('a11y.tableGrid')}
      className="grid grid-cols-[repeat(auto-fill,minmax(calc(12.5rem*var(--app-card-scale)),1fr))] gap-4"
    >
      {visible.map((table) => (
        <li key={table.id} className="relative">
          <TableCard
            table={table}
            order={table.activeOrderId ? orderById.get(table.activeOrderId) : undefined}
            format={format}
            onSelect={(selected) => void handleTableTap(selected)}
            isCurrent={table.id === currentTableId}
            view={view}
            now={now}
          />
          <IconButton
            label={t('tables.actionsTitle', { name: format.digits(table.name) })}
            icon={<EllipsisVertical className="size-5" aria-hidden />}
            size="md"
            variant="ghost"
            onClick={() => openModal({ type: 'tableActions', tableId: table.id })}
            className="absolute end-1.5 bottom-1.5"
            showTooltip={false}
          />
        </li>
      ))}
    </ul>
  );
}

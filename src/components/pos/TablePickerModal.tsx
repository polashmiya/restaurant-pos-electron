import { LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/common/EmptyState';
import { Modal } from '@/components/common/Modal';
import { TableCard } from '@/components/tables/TableCard';
import { TableStatusLegend } from '@/components/tables/TableStatusLegend';
import { useFormatters } from '@/hooks/useFormatters';
import { promptGuestCount, selectTableForCurrentOrder } from '@/services/posActions';
import { useOrderStore } from '@/store/orderStore';
import { usePosStore } from '@/store/posStore';
import { useTableStore } from '@/store/tableStore';
import type { DiningTable } from '@/types';

/** Table selection for a dine-in order. */
export function TablePickerModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const tables = useTableStore((state) => state.tables);
  const openOrders = useOrderStore((state) => state.openOrders);
  const currentTableId = usePosStore((state) => state.draft.tableId);
  const [busy, setBusy] = useState(false);

  const orderById = useMemo(() => new Map(openOrders.map((order) => [order.id, order])), [openOrders]);

  const select = async (table: DiningTable) => {
    if (busy) return;
    setBusy(true);
    const seatsNewGuests = !table.activeOrderId;
    try {
      if (await selectTableForCurrentOrder(table.id)) {
        onClose();
        if (seatsNewGuests) promptGuestCount();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tablePicker.title')}
      description={t('tablePicker.subtitle')}
      size="xl"
      dismissible={!busy}
    >
      {tables.length === 0 ? (
        <EmptyState icon={<LayoutGrid aria-hidden />} title={t('tables.noTables')} description={t('tables.noTablesHint')} />
      ) : (
        <div className="space-y-4">
          <TableStatusLegend />
          <div
            role="list"
            aria-label={t('a11y.tableGrid')}
            className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3"
          >
            {tables.map((table) => (
              <div role="listitem" key={table.id}>
                <TableCard
                  table={table}
                  order={table.activeOrderId ? orderById.get(table.activeOrderId) : undefined}
                  format={format}
                  onSelect={(selected) => void select(selected)}
                  isCurrent={table.id === currentTableId}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

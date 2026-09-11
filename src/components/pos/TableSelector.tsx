import { Armchair, ChevronRight, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useTableStore } from '@/store/tableStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

/** Dine-in: shows the selected table (required) and opens the table picker. */
export function TableSelector() {
  const { t } = useTranslation();
  const format = useFormatters();
  const tableId = usePosStore((state) => state.draft.tableId);
  const table = useTableStore((state) => state.tables.find((entry) => entry.id === tableId));
  const openModal = useUIStore((state) => state.openModal);

  return (
    <button
      type="button"
      onClick={() => openModal({ type: 'tablePicker' })}
      className={cn(
        'flex min-h-touch w-full items-center gap-3 rounded-control border px-4 text-start transition-colors',
        table
          ? 'border-border bg-surface-2 hover:bg-surface-3'
          : 'border-warning/60 bg-warning/10 text-warning-text hover:bg-warning/15',
      )}
    >
      {table ? (
        <Armchair className="size-5 shrink-0 text-primary-text" aria-hidden />
      ) : (
        <TriangleAlert className="size-5 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        {table ? (
          <>
            <span className="block font-semibold">{t('tables.tableName', { name: format.digits(table.name) })}</span>
            <span className="block text-sm text-fg-muted">{t('tables.capacity', { count: table.capacity })}</span>
          </>
        ) : (
          <>
            <span className="block font-semibold">{t('cart.selectTable')}</span>
            <span className="block text-sm">{t('cart.tableRequired')}</span>
          </>
        )}
      </span>
      <span className="flex items-center gap-1 text-sm font-semibold text-primary-text">
        {table && t('cart.changeTable')}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </span>
    </button>
  );
}

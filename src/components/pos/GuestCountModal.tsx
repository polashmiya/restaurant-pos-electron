import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useTableStore } from '@/store/tableStore';
import { cn } from '@/utils/cn';

/**
 * "How many guests?" — one tap picks the number (shown on the table picture,
 * the KOT and the receipt). Numbers beyond the table's seats are dashed.
 */
export function GuestCountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const guests = usePosStore((state) => state.draft.guests);
  const tableId = usePosStore((state) => state.draft.tableId);
  const setGuests = usePosStore((state) => state.setGuests);
  const table = useTableStore((state) => state.tables.find((entry) => entry.id === tableId));
  const seats = table?.capacity ?? APP_CONFIG.order.guestQuickPicks;
  const choices = Math.min(Math.max(APP_CONFIG.order.guestQuickPicks, seats), APP_CONFIG.order.maxGuests);
  const focusValue = guests ?? Math.min(2, seats);

  const choose = (value: number | undefined) => {
    setGuests(value);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('guests.title')}
      description={
        table ? `${t('tables.tableName', { name: format.digits(table.name) })} · ${t('tables.capacity', { count: table.capacity })}` : undefined
      }
      size="sm"
      footer={
        guests ? (
          <Button variant="secondary" onClick={() => choose(undefined)}>
            {t('guests.clear')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t('guests.skip')}
          </Button>
        )
      }
    >
      <div role="group" aria-label={t('guests.title')} className="grid grid-cols-4 gap-3">
        {Array.from({ length: choices }, (_, index) => index + 1).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={guests === value}
            aria-label={t('tables.guestsCount', { count: value })}
            data-autofocus={value === focusValue || undefined}
            className={cn(
              'grid min-h-16 place-items-center rounded-control border-2 text-2xl font-extrabold tabular-nums transition-colors',
              guests === value
                ? 'border-primary bg-primary text-primary-fg'
                : value <= seats
                  ? 'border-border bg-surface-2 text-fg hover:border-primary/60 hover:bg-surface-3'
                  : 'border-dashed border-border-strong text-fg-muted hover:bg-surface-2',
            )}
          >
            {format.number(value)}
          </button>
        ))}
      </div>
      {table && choices > table.capacity && (
        <p className="mt-3 text-sm text-fg-muted">{t('guests.extraSeatsHint', { count: table.capacity })}</p>
      )}
    </Modal>
  );
}

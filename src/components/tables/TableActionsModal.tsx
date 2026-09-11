import { CalendarClock, CalendarPlus, CalendarX, Hourglass, Phone, Play, ReceiptText, StickyNote, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useFormatters } from '@/hooks/useFormatters';
import {
  cancelReservation,
  openTableOrder,
  setTableWaiting,
  startOrderAtTable,
} from '@/services/tableActions';
import { useOrder } from '@/store/orderStore';
import { useTableStore } from '@/store/tableStore';
import { useUIStore } from '@/store/uiStore';
import { TABLE_STATUS_VISUALS } from './tableVisuals';

/** Details and every available action for one table. */
export function TableActionsModal({ tableId, onClose }: { tableId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const table = useTableStore((state) => state.tables.find((entry) => entry.id === tableId));
  const order = useOrder(table?.activeOrderId);
  const replaceModal = useUIStore((state) => state.replaceModal);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!table) onClose();
  }, [table, onClose]);

  if (!table) return null;

  const visual = TABLE_STATUS_VISUALS[table.status];
  const StatusIcon = visual.icon;
  const run = async (action: () => Promise<boolean>, closeOnSuccess = false) => {
    setBusy(true);
    try {
      const ok = await action();
      if (ok && closeOnSuccess) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tables.actionsTitle', { name: format.digits(table.name) })}
      size="sm"
      dismissible={!busy}
      headerActions={
        <Badge tone={visual.tone} size="md" icon={<StatusIcon className="size-4" aria-hidden />}>
          {t(`tableStatus.${table.status}`)}
        </Badge>
      }
    >
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-fg-muted">
          <Users className="size-4" aria-hidden />
          {t('tables.capacity', { count: table.capacity })}
          {table.statusSince && table.status !== 'available' && ` · ${t('tables.since', { time: format.time(table.statusSince) })}`}
        </p>

        {order && (
          <div className="rounded-card border border-border bg-surface-2 p-4">
            <p className="font-bold selectable">{order.orderNumber}</p>
            <p className="text-sm text-fg-muted">
              {t('common.itemCount', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{format.currency(order.total)}</p>
          </div>
        )}

        {table.reservation && (
          <section
            aria-label={t('tables.reservation')}
            className="space-y-2 rounded-card border border-status-reserved/50 bg-status-reserved/8 p-4"
          >
            <p className="flex items-center gap-2 font-semibold">
              <CalendarClock className="size-4 text-status-reserved" aria-hidden />
              {table.reservation.guestName} · {format.digits(table.reservation.time)}
            </p>
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Users className="size-4" aria-hidden />
              {t('tables.guestsCount', { count: table.reservation.guests })}
            </p>
            {table.reservation.phone && (
              <p className="flex items-center gap-2 text-sm text-fg-muted selectable">
                <Phone className="size-4" aria-hidden />
                {format.digits(table.reservation.phone)}
              </p>
            )}
            {table.reservation.note && (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <StickyNote className="size-4" aria-hidden />
                {table.reservation.note}
              </p>
            )}
          </section>
        )}

        <div className="grid gap-2">
          {table.status === 'available' && (
            <>
              <Button
                variant="primary"
                size="lg"
                icon={<Play className="size-5" aria-hidden />}
                onClick={() => void run(() => startOrderAtTable(table.id))}
                loading={busy}
              >
                {t('tables.startOrder')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                icon={<CalendarPlus className="size-5" aria-hidden />}
                onClick={() => replaceModal({ type: 'reserveTable', tableId: table.id })}
                disabled={busy}
              >
                {t('tables.reserve')}
              </Button>
            </>
          )}

          {table.status === 'reserved' && (
            <>
              <Button
                variant="primary"
                size="lg"
                icon={<Play className="size-5" aria-hidden />}
                onClick={() => void run(() => startOrderAtTable(table.id))}
                loading={busy}
              >
                {t('tables.seatGuests')}
              </Button>
              <Button
                variant="danger-soft"
                size="lg"
                icon={<CalendarX className="size-5" aria-hidden />}
                onClick={() => void run(() => cancelReservation(table.id), true)}
                disabled={busy}
              >
                {t('tables.cancelReservation')}
              </Button>
            </>
          )}

          {(table.status === 'occupied' || table.status === 'waiting') && (
            <>
              <Button
                variant="primary"
                size="lg"
                icon={<ReceiptText className="size-5" aria-hidden />}
                onClick={() => void run(() => openTableOrder(table.id))}
                loading={busy}
              >
                {t('tables.openOrder')}
              </Button>
              <Button
                variant="success"
                size="lg"
                icon={<Wallet className="size-5" aria-hidden />}
                onClick={() => void run(() => openTableOrder(table.id, { openPayment: true }))}
                disabled={busy}
              >
                {t('tables.openBill')}
              </Button>
              {table.status === 'occupied' ? (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Hourglass className="size-5" aria-hidden />}
                  onClick={() => void run(() => setTableWaiting(table.id, true), true)}
                  disabled={busy}
                >
                  {t('tables.requestBill')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Users className="size-5" aria-hidden />}
                  onClick={() => void run(() => setTableWaiting(table.id, false), true)}
                  disabled={busy}
                >
                  {t('tables.backToOccupied')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

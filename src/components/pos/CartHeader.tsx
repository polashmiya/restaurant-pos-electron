import { FilePlus, Pause, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { IconButton } from '@/components/common/IconButton';
import { requestClearOrder, requestNewOrder } from '@/services/posActions';
import { useHeldOrders } from '@/store/orderStore';
import { useCartTotals, usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';

export function CartHeader() {
  const { t } = useTranslation();
  const orderNumber = usePosStore((state) => state.draft.orderNumber);
  const hasContent = usePosStore((state) => state.draft.items.length > 0 || Boolean(state.draft.tableId));
  const { itemCount } = useCartTotals();
  const heldCount = useHeldOrders().length;
  const openModal = useUIStore((state) => state.openModal);

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold selectable">
          {orderNumber ? t('cart.orderNumber', { number: orderNumber }) : t('cart.newOrder')}
        </h2>
        <p className="text-sm text-fg-muted">{t('common.itemCount', { count: itemCount })}</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        icon={<Pause className="size-4" aria-hidden />}
        onClick={() => openModal({ type: 'heldOrders' })}
        aria-label={t('heldOrders.title')}
      >
        {t('pos.heldCount', { count: heldCount })}
      </Button>
      <IconButton
        label={t('pos.newOrder')}
        icon={<FilePlus className="size-5" aria-hidden />}
        onClick={() => void requestNewOrder()}
        disabled={!hasContent}
      />
      <IconButton
        label={t('cart.clearOrder')}
        icon={<Trash className="size-5" aria-hidden />}
        variant="danger-soft"
        onClick={() => void requestClearOrder()}
        disabled={!hasContent}
        tooltipSide="bottom-end"
      />
    </div>
  );
}

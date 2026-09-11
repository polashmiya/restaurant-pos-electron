import { useTranslation } from 'react-i18next';
import { usePosStore } from '@/store/posStore';
import { CartActions } from './CartActions';
import { CartHeader } from './CartHeader';
import { CartItemList } from './CartItemList';
import { CustomerForm } from './CustomerForm';
import { GuestCountButton } from './GuestCountButton';
import { OrderSummary } from './OrderSummary';
import { OrderTypeSelector } from './OrderTypeSelector';
import { TableSelector } from './TableSelector';

/** Right side of the POS: order type, table/customer, items, summary, pay. */
export function CartPanel() {
  const { t } = useTranslation();
  const orderType = usePosStore((state) => state.draft.orderType);
  const hasTable = usePosStore((state) => Boolean(state.draft.tableId));

  return (
    <section aria-label={t('cart.title')} className="flex h-full min-h-0 w-full flex-col bg-surface">
      <CartHeader />
      <div className="space-y-2 border-b border-border px-4 py-2 compact:space-y-1.5 compact:px-3 compact:py-1.5">
        <OrderTypeSelector />
        {orderType === 'dine-in' && (
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <TableSelector />
            </div>
            {hasTable && <GuestCountButton />}
          </div>
        )}
        {orderType === 'delivery' && <CustomerForm />}
      </div>
      <CartItemList />
      <OrderSummary />
      <CartActions />
    </section>
  );
}

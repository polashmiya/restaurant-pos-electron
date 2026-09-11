import { ChefHat, Pause, Printer } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Kbd } from '@/components/common/Kbd';
import { KEYBOARD_SHORTCUTS } from '@/config/app.config';
import { requestHoldOrder, requestPayment } from '@/services/posActions';
import { printBillForCurrentOrder, sendCurrentOrderToKitchen } from '@/services/printActions';
import { usePosStore } from '@/store/posStore';
import { cn } from '@/utils/cn';

type Busy = 'hold' | 'kot' | 'bill' | null;

export function CartActions() {
  const { t } = useTranslation();
  const hasItems = usePosStore((state) => state.draft.items.length > 0);
  const isDineIn = usePosStore((state) => state.draft.orderType === 'dine-in');
  const processing = usePosStore((state) => state.isProcessingPayment);
  const [busy, setBusy] = useState<Busy>(null);

  const run = async (action: Busy, job: () => Promise<void>) => {
    setBusy(action);
    try {
      await job();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 border-t border-border px-4 py-3 compact:space-y-1.5 compact:px-3 compact:py-2">
      <div className={cn('grid gap-2', isDineIn ? 'grid-cols-3' : 'grid-cols-2')}>
        <Button
          variant="secondary"
          icon={<Pause className="size-5" aria-hidden />}
          onClick={() => void run('hold', requestHoldOrder)}
          disabled={!hasItems || busy !== null}
          loading={busy === 'hold'}
          className="px-2"
        >
          {t('cart.hold')}
        </Button>
        <Button
          variant="secondary"
          icon={<ChefHat className="size-5" aria-hidden />}
          onClick={() => void run('kot', sendCurrentOrderToKitchen)}
          disabled={!hasItems || busy !== null}
          loading={busy === 'kot'}
          aria-label={t('cart.sendToKitchen')}
          className="px-2"
        >
          {t('cart.kot')}
        </Button>
        {isDineIn && (
          <Button
            variant="secondary"
            icon={<Printer className="size-5" aria-hidden />}
            onClick={() => void run('bill', printBillForCurrentOrder)}
            disabled={!hasItems || busy !== null}
            loading={busy === 'bill'}
            aria-label={t('cart.printBill')}
            className="px-2"
          >
            {t('cart.bill')}
          </Button>
        )}
      </div>
      <Button
        variant="success"
        size="lg"
        fullWidth
        onClick={() => void requestPayment()}
        disabled={!hasItems || processing}
        loading={processing}
        iconEnd={<Kbd tone="inherit">{KEYBOARD_SHORTCUTS.payment.label}</Kbd>}
      >
        {t('cart.payAndPrint')}
      </Button>
    </div>
  );
}

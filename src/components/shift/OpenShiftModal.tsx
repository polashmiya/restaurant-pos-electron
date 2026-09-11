import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { playSound } from '@/services/sound';
import { useShiftStore } from '@/store/shiftStore';
import { toast, useUIStore } from '@/store/uiStore';
import { getErrorMessageKey } from '@/utils/errors';

/** Opens a shift (cashier + opening float). Optionally continues to payment. */
export function OpenShiftModal({ thenOpenPayment = false, onClose }: { thenOpenPayment?: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const openShift = useShiftStore((state) => state.openShift);
  const replaceModal = useUIStore((state) => state.replaceModal);
  const [cashierName, setCashierName] = useState('');
  const [openingCash, setOpeningCash] = useState<number | null>(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = submitted && !cashierName.trim() ? t('validation.required') : undefined;
  const cashError =
    submitted && (openingCash === null || openingCash < 0) ? t('validation.min', { min: format.number(0) }) : undefined;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (!cashierName.trim() || openingCash === null || openingCash < 0) return;
    setSaving(true);
    try {
      await openShift({ cashierName, openingCash });
      playSound('success');
      toast.success(message('shift.opened'));
      if (thenOpenPayment) replaceModal({ type: 'payment' });
      else onClose();
    } catch (error) {
      toast.error(message(getErrorMessageKey(error)));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('shift.open')}
      description={t('shift.noOpenShiftHint')}
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving} icon={<LogIn className="size-5" aria-hidden />}>
            {t('shift.open')}
          </Button>
        </>
      }
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <Input
          label={t('shift.cashierName')}
          placeholder={t('shift.cashierPlaceholder')}
          value={cashierName}
          onChange={(event) => setCashierName(event.target.value)}
          error={nameError}
          required
          maxLength={60}
          data-autofocus
        />
        <NumberInput
          label={t('shift.openingCash')}
          value={openingCash}
          onValueChange={setOpeningCash}
          prefix={format.context.currencySymbol}
          size="lg"
          error={cashError}
        />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

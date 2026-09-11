import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { Textarea } from '@/components/common/Textarea';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { attempt } from '@/services/actionRunner';
import { useCurrentShift, useShiftStore } from '@/store/shiftStore';
import { toast, useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';
import { toMinor } from '@/utils/money';
import { calculateCashDifference, calculateExpectedCash } from '@/utils/shiftMath';

/** Count the drawer and close the shift; then show the shift report. */
export function CloseShiftModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const shift = useCurrentShift();
  const closeShift = useShiftStore((state) => state.closeShift);
  const replaceModal = useUIStore((state) => state.replaceModal);
  const [countedCash, setCountedCash] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!shift) return null;

  const expected = calculateExpectedCash(shift);
  const difference = countedCash !== null ? calculateCashDifference(shift, countedCash) : null;
  const differenceMinor = difference === null ? 0 : toMinor(difference);

  const submit = async () => {
    if (countedCash === null || countedCash < 0) return;
    setSaving(true);
    let closedId: string | null = null;
    const ok = await attempt('close-shift', async () => {
      closedId = (await closeShift({ closingCash: countedCash, notes })).id;
    });
    setSaving(false);
    if (ok && closedId) {
      toast.success(message('shift.closed'));
      replaceModal({ type: 'shiftReport', shiftId: closedId });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('shift.closeTitle')}
      description={t('shift.closeMessage')}
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            icon={<LogOut className="size-5" aria-hidden />}
            onClick={() => void submit()}
            loading={saving}
            disabled={countedCash === null || countedCash < 0}
          >
            {t('shift.close')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-card bg-surface-2 p-4">
            <dt className="text-sm text-fg-muted">{t('shift.totalRevenue')}</dt>
            <dd className="text-xl font-bold tabular-nums">{format.currency(shift.totalSales)}</dd>
          </div>
          <div className="rounded-card bg-surface-2 p-4">
            <dt className="text-sm text-fg-muted">{t('shift.expectedCash')}</dt>
            <dd className="text-xl font-bold tabular-nums">{format.currency(expected)}</dd>
          </div>
        </dl>
        <NumberInput
          label={t('shift.closingCash')}
          value={countedCash}
          onValueChange={setCountedCash}
          prefix={format.context.currencySymbol}
          size="lg"
          data-autofocus
        />
        {difference !== null && (
          <div
            role="status"
            className={cn(
              'flex items-center justify-between rounded-card border-2 px-4 py-3 font-bold',
              differenceMinor === 0
                ? 'border-success/50 bg-success/10 text-success-text'
                : differenceMinor > 0
                  ? 'border-info/50 bg-info/10 text-info-text'
                  : 'border-danger/50 bg-danger/10 text-danger-text',
            )}
          >
            <span>
              {t('shift.difference')} ·{' '}
              {differenceMinor === 0 ? t('shift.balanced') : differenceMinor > 0 ? t('shift.over') : t('shift.short')}
            </span>
            <span className="tabular-nums">{format.currency(difference)}</span>
          </div>
        )}
        <Textarea label={t('shift.notes')} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} rows={2} />
      </div>
    </Modal>
  );
}

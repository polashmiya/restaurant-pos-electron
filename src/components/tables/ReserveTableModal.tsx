import { CalendarPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { useFormatters } from '@/hooks/useFormatters';
import { reserveTable } from '@/services/tableActions';
import { useTableStore } from '@/store/tableStore';
import { toWesternDigits } from '@/utils/format';
import { isValidPhone, isValidTime } from '@/utils/parse';

/** Suggested booking time: the next half hour. */
function suggestedTime(now: Date = new Date()): string {
  const next = new Date(now.getTime() + 30 * 60_000);
  next.setMinutes(next.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

export function ReserveTableModal({ tableId, onClose }: { tableId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const table = useTableStore((state) => state.tables.find((entry) => entry.id === tableId));
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState(suggestedTime);
  const [guests, setGuests] = useState<number | null>(table?.capacity ?? 2);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    guestName: !guestName.trim() ? t('validation.required') : undefined,
    phone: phone.trim() && !isValidPhone(phone) ? t('validation.phoneInvalid') : undefined,
    time: !isValidTime(time) ? t('validation.timeInvalid') : undefined,
    guests: guests === null || guests < 1 ? t('validation.min', { min: format.number(1) }) : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (hasErrors || !table) return;
    setSaving(true);
    const ok = await reserveTable(table.id, {
      guestName: guestName.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      time: toWesternDigits(time.trim()).padStart(5, '0'),
      guests: Math.trunc(guests ?? 1),
      ...(note.trim() ? { note: note.trim() } : {}),
      createdAt: new Date().toISOString(),
    });
    setSaving(false);
    if (ok) onClose();
  };

  if (!table) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t('tables.reserveTitle', { name: format.digits(table.name) })}
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => void submit()}
            loading={saving}
            icon={<CalendarPlus className="size-5" aria-hidden />}
          >
            {t('tables.reserve')}
          </Button>
        </>
      }
    >
      <form onSubmit={(event) => void submit(event)} className="grid grid-cols-2 gap-4">
        <Input
          label={t('tables.guestName')}
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          error={submitted ? errors.guestName : undefined}
          required
          maxLength={80}
          containerClassName="col-span-2"
          data-autofocus
        />
        <Input
          label={t('tables.guestPhone')}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={submitted ? errors.phone : undefined}
          inputMode="tel"
          maxLength={24}
          hint={t('common.optional')}
          containerClassName="col-span-2"
        />
        <Input
          label={t('tables.reservationTime')}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          error={submitted ? errors.time : undefined}
          placeholder="19:30"
          inputMode="numeric"
          maxLength={5}
          required
        />
        <NumberInput
          label={t('tables.guests')}
          value={guests}
          onValueChange={setGuests}
          decimals={0}
          error={submitted ? errors.guests : undefined}
        />
        <Input
          label={t('tables.reservationNote')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={120}
          hint={t('common.optional')}
          containerClassName="col-span-2"
        />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

import { Delete } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '@/hooks/useFormatters';
import { cn } from '@/utils/cn';
import type { KeypadKey } from '@/utils/keypad';

const KEYS: KeypadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', '.'];

/** Large touch keypad for entering the cash amount received. */
export function NumericKeypad({
  onKey,
  onClear,
  disabled = false,
}: {
  onKey: (key: KeypadKey) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormatters();

  const keyClass =
    'min-h-14 rounded-control border border-border bg-surface-2 text-xl font-bold tabular-nums transition-colors hover:bg-surface-3 active:bg-surface-3 disabled:opacity-40';

  return (
    <div role="group" aria-label={t('payment.keypad')} className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button key={key} type="button" className={keyClass} onClick={() => onKey(key)} disabled={disabled}>
          {key === '.' ? '.' : format.digits(key)}
        </button>
      ))}
      <button
        type="button"
        className={cn(keyClass, 'col-span-2 text-base')}
        onClick={onClear}
        disabled={disabled}
        aria-label={t('payment.clearAmount')}
      >
        {t('common.clear')}
      </button>
      <button
        type="button"
        className={cn(keyClass, 'grid place-items-center')}
        onClick={() => onKey('backspace')}
        disabled={disabled}
        aria-label={t('payment.backspace')}
      >
        <Delete className="size-6 rtl:rotate-180" aria-hidden />
      </button>
    </div>
  );
}

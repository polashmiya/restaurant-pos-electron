import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '@/utils/cn';
import { toWesternDigits } from '@/utils/format';
import { parseNumberInput } from '@/utils/parse';
import { Field } from './Field';
import { controlClassName } from './styles';

function toText(value: number | null): string {
  return value === null ? '' : String(value);
}

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'size' | 'prefix'> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Maximum decimal places allowed while typing. */
  decimals?: number;
  allowNegative?: boolean;
  size?: 'md' | 'lg' | 'xl';
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

const SIZE_CLASSES = {
  md: 'min-h-touch text-base',
  lg: 'min-h-14 text-xl font-semibold',
  xl: 'min-h-16 text-3xl font-bold',
} as const;

/**
 * Decimal input with a text keyboard-friendly behaviour (no spinners),
 * tolerant of Bangla digits, emitting `null` when empty.
 */
export function NumberInput({
  value,
  onValueChange,
  label,
  hint,
  error,
  decimals = 2,
  allowNegative = false,
  size = 'md',
  prefix,
  suffix,
  id,
  required,
  className,
  containerClassName,
  ref,
  ...rest
}: NumberInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [text, setText] = useState(() => toText(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Keep the text in sync when the value is changed from outside (quick
  // buttons, keypad) without disturbing what the user is typing ("1." stays).
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (parseNumberInput(text) !== value) setText(toText(value));
  }

  const handleChange = (raw: string) => {
    const western = toWesternDigits(raw).replace(/,/g, '');
    const pattern = new RegExp(`^${allowNegative ? '-?' : ''}\\d*(\\.\\d{0,${decimals}})?$`);
    if (western !== '' && !pattern.test(western)) return;
    const parsed = parseNumberInput(western);
    setText(western);
    setSyncedValue(parsed);
    onValueChange(parsed);
  };

  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute start-3.5 text-fg-muted" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          required={required}
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            controlClassName,
            SIZE_CLASSES[size],
            'tabular-nums',
            prefix ? 'ps-10' : undefined,
            suffix ? 'pe-12' : undefined,
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute end-3.5 text-fg-muted" aria-hidden>
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

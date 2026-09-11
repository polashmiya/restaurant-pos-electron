import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Field } from './Field';
import { controlClassName } from './styles';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLSelectElement>;
}

/** Native <select> (keyboard + screen reader friendly) with app styling. */
export function Select<T extends string = string>({
  value,
  onValueChange,
  options,
  label,
  hint,
  error,
  id,
  className,
  containerClassName,
  required,
  ref,
  ...rest
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <Field label={label} htmlFor={selectId} hint={hint} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          value={value}
          required={required}
          onChange={(event) => onValueChange(event.target.value as T)}
          aria-invalid={error ? true : undefined}
          className={cn(controlClassName, 'min-h-touch cursor-pointer appearance-none pe-10', className)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" aria-hidden />
      </div>
    </Field>
  );
}

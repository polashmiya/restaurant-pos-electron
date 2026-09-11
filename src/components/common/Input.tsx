import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '@/utils/cn';
import { Field } from './Field';
import { controlClassName } from './styles';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, id, required, className, containerClassName, ref, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required} className={containerClassName}>
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClassName, 'min-h-touch', className)}
        {...rest}
      />
    </Field>
  );
}

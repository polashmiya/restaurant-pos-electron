import { useId, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Field } from './Field';
import { controlClassName } from './styles';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hint,
  error,
  id,
  required,
  className,
  containerClassName,
  rows = 3,
  ref,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} required={required} className={containerClassName}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(controlClassName, 'resize-none py-3 leading-relaxed', className)}
        {...rest}
      />
    </Field>
  );
}

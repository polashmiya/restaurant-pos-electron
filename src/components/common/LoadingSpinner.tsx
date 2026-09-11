import { cn } from '@/utils/cn';

const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-10 border-[3px]',
} as const;

export interface LoadingSpinnerProps {
  size?: keyof typeof SIZES;
  /** Accessible status text; omit when the spinner sits inside a labelled control. */
  label?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', label, className }: LoadingSpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className={cn('inline-flex items-center gap-3', className)}>
      <span
        aria-hidden
        className={cn('animate-spin rounded-full border-current border-e-transparent opacity-80', SIZES[size])}
      />
      {label && <span className="text-fg-muted">{label}</span>}
    </span>
  );
}

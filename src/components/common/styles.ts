import { cn } from '@/utils/cn';

/** Shared look of text inputs, selects and textareas. */
export const controlClassName = cn(
  'w-full rounded-control border border-border bg-surface-2 px-3.5 text-base text-fg',
  'placeholder:text-fg-subtle transition-colors duration-150',
  'hover:border-border-strong focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/40',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-[invalid=true]:border-danger',
);

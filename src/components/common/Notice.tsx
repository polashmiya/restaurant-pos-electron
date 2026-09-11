import { CircleAlert, CircleCheckBig, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<NoticeTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: 'bg-info/10 text-info-text' },
  success: { icon: CircleCheckBig, className: 'bg-success/10 text-success-text' },
  warning: { icon: TriangleAlert, className: 'bg-warning/10 text-warning-text' },
  danger: { icon: CircleAlert, className: 'bg-danger/10 text-danger-text' },
};

export interface NoticeProps {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
}

/** A short inline message box (desktop-only features, missing printers…) with a tone icon. */
export function Notice({ tone = 'info', children, className }: NoticeProps) {
  const { icon: Icon, className: toneClassName } = TONES[tone];
  return (
    <p className={cn('flex items-start gap-2 rounded-control p-3 text-sm', toneClassName, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

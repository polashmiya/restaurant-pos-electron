import { CircleAlert, CircleCheckBig, Info, TriangleAlert, X } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, type Toast as ToastModel, type ToastTone } from '@/store/uiStore';
import { cn } from '@/utils/cn';

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheckBig, className: 'border-success/40 [&_svg.toast-icon]:text-success-text' },
  error: { icon: CircleAlert, className: 'border-danger/50 [&_svg.toast-icon]:text-danger-text' },
  warning: { icon: TriangleAlert, className: 'border-warning/50 [&_svg.toast-icon]:text-warning-text' },
  info: { icon: Info, className: 'border-info/40 [&_svg.toast-icon]:text-info-text' },
};

const ToastItem = memo(function ToastItem({ toast }: { toast: ToastModel }) {
  const { t } = useTranslation();
  const dismiss = useUIStore((state) => state.dismissToast);
  const { icon: Icon, className } = TONE_STYLES[toast.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id, toast.durationMs]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-card border bg-surface-3 px-4 py-3 text-fg shadow-xl',
        'animate-[toast-in_160ms_ease-out]',
        className,
      )}
    >
      <Icon className="toast-icon mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-relaxed font-medium">
        {t(toast.message.key, toast.message.params ?? {})}
      </p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t('a11y.dismiss')}
        className="-me-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
});

/** Notification area (bottom-end corner, above everything). */
export function ToastViewport() {
  const { t } = useTranslation();
  const toasts = useUIStore((state) => state.toasts);

  return (
    <section
      aria-label={t('a11y.notifications')}
      aria-live="polite"
      className="pointer-events-none fixed end-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 no-print"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </section>
  );
}

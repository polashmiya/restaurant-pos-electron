import { CircleAlert, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';

export function StartupError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-5 bg-bg p-8 text-center text-fg">
      <span className="grid size-16 place-items-center rounded-full bg-danger/15 text-danger-text">
        <CircleAlert className="size-8" aria-hidden />
      </span>
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold">{t('app.startupFailed')}</h1>
        <p className="text-fg-muted">{t('app.startupFailedHint')}</p>
      </div>
      <Button variant="primary" size="lg" icon={<RotateCcw className="size-5" aria-hidden />} onClick={onRetry}>
        {t('app.tryAgain')}
      </Button>
    </div>
  );
}

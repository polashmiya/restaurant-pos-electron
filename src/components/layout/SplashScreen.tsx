import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { APP_CONFIG } from '@/config/app.config';
import { AppLogo } from './AppLogo';

export function SplashScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg text-fg">
      <AppLogo size="lg" />
      <p className="text-2xl font-bold">{APP_CONFIG.name}</p>
      <LoadingSpinner size="md" label={t('app.preparing')} />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/settings/LanguageSwitcher';
import { ThemeToggleButton } from '@/components/settings/ThemeSwitcher';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { isDesktopRuntime } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { AppLogo } from './AppLogo';
import { HeaderClock } from './HeaderClock';
import { ShiftStatus } from './ShiftStatus';

/** Restaurant name · date/time · shift & cashier · language · theme (master spec §79). */
export function Header() {
  const { t } = useTranslation();
  const format = useFormatters();
  const restaurantName = useSettingsStore((state) => state.settings.name);

  return (
    <header className="flex h-header shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AppLogo />
        <div className="min-w-0">
          <p className="truncate text-lg leading-tight font-bold">{format.text(restaurantName)}</p>
          <p className="truncate text-xs text-fg-muted">
            {APP_CONFIG.name}
            {!isDesktopRuntime() && <span className="ms-2 text-warning-text">· {t('app.browserMode')}</span>}
          </p>
        </div>
      </div>
      <HeaderClock />
      <ShiftStatus />
      <LanguageSwitcher size="sm" />
      <ThemeToggleButton />
    </header>
  );
}

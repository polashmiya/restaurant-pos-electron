import { useTranslation } from 'react-i18next';
import { LanguageSwitcher, LanguageToggleButton } from '@/components/settings/LanguageSwitcher';
import { ThemeToggleButton } from '@/components/settings/ThemeSwitcher';
import { APP_CONFIG } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { isDesktopRuntime } from '@/services/storage';
import { useSettingsStore } from '@/store/settingsStore';
import { AppLogo } from './AppLogo';
import { HeaderClock } from './HeaderClock';
import { ShiftStatus } from './ShiftStatus';

/**
 * Restaurant name · date/time · shift & cashier · language · theme (master
 * spec §79). Narrow windows drop what the rest of the app already provides:
 * the logo, the clock (also in the shift status) and the wide language
 * switcher, which becomes a single toggle button.
 */
export function Header() {
  const { t } = useTranslation();
  const format = useFormatters();
  const restaurantName = useSettingsStore((state) => state.settings.name);

  return (
    <header className="flex h-header shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden sm:block">
          <AppLogo />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base leading-tight font-bold sm:text-lg">{format.text(restaurantName)}</p>
          <p className="truncate text-xs text-fg-muted">
            {APP_CONFIG.name}
            {!isDesktopRuntime() && <span className="ms-2 text-warning-text">· {t('app.browserMode')}</span>}
          </p>
        </div>
      </div>
      <HeaderClock />
      <ShiftStatus />
      <div className="hidden sm:block">
        <LanguageSwitcher size="sm" />
      </div>
      <LanguageToggleButton className="sm:hidden" />
      <ThemeToggleButton />
    </header>
  );
}

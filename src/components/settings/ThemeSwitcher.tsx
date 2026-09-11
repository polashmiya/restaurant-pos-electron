import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/common/IconButton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { Theme } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';

const THEME_ORDER: Theme[] = ['dark', 'light', 'system'];
const THEME_ICONS = { dark: Moon, light: Sun, system: Monitor } as const;

function useThemeSetter() {
  const theme = useSettingsStore((state) => state.settings.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const change = (next: Theme) => {
    if (next === theme) return;
    setTheme(next).catch((error: unknown) => toast.error(message(getErrorMessageKey(error))));
  };
  return { theme, change };
}

/** Header button: cycles Dark → Light → System. */
export function ThemeToggleButton() {
  const { t } = useTranslation();
  const { theme, change } = useThemeSetter();
  const Icon = THEME_ICONS[theme];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length] ?? 'dark';
  return (
    <IconButton
      label={t('header.themeCurrent', { theme: t(`theme.${theme}`) })}
      icon={<Icon className="size-5" aria-hidden />}
      onClick={() => change(next)}
      tooltipSide="bottom-end"
    />
  );
}

/** Settings: explicit Dark / Light / System choice. */
export function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, change } = useThemeSetter();
  return (
    <SegmentedControl<Theme>
      label={t('theme.label')}
      value={theme}
      onValueChange={change}
      options={THEME_ORDER.map((value) => {
        const Icon = THEME_ICONS[value];
        return { value, label: t(`theme.${value}`), icon: <Icon className="size-4" aria-hidden /> };
      })}
    />
  );
}

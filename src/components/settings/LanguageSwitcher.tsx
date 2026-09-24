import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/common/IconButton';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { LANGUAGES } from '@/config/app.config';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { Language } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';

export interface LanguageSwitcherProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  fullWidth?: boolean;
}

/**
 * বাংলা | English. Switching updates i18n instantly, keeps the current
 * cart/order and persists the choice (it survives restarts).
 */
export function LanguageSwitcher({ size = 'sm', showIcon = false, fullWidth = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.settings.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const change = (next: Language) => {
    if (next === language) return;
    setLanguage(next).catch((error: unknown) => toast.error(message(getErrorMessageKey(error))));
  };

  return (
    <div className="flex items-center gap-2">
      {showIcon && <Languages className="size-5 text-fg-muted" aria-hidden />}
      <SegmentedControl<Language>
        label={t('language.label')}
        value={language}
        onValueChange={change}
        size={size}
        fullWidth={fullWidth}
        options={LANGUAGES.map((option) => ({
          value: option.code,
          label: <span lang={option.code}>{option.nativeName}</span>,
          ariaLabel: option.nativeName,
        }))}
      />
    </div>
  );
}

/**
 * The header's language control on narrow screens: one button that switches
 * to the other language (the full switcher needs more width than a phone
 * header has to spare).
 */
export function LanguageToggleButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.settings.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const next = LANGUAGES.find((option) => option.code !== language) ?? LANGUAGES[0]!;

  return (
    <span className={className}>
      <IconButton
        label={t('language.switchTo', { language: next.nativeName })}
        icon={<Languages className="size-5" aria-hidden />}
        onClick={() => {
          setLanguage(next.code).catch((error: unknown) => toast.error(message(getErrorMessageKey(error))));
        }}
        tooltipSide="bottom-end"
      />
    </span>
  );
}

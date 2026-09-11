import { ALargeSmall, Eye, Palette, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Switch } from '@/components/common/Switch';
import { CARD_SIZES, LAYOUT_DENSITIES, TABLE_VIEWS, TEXT_SIZES } from '@/config/app.config';
import { createDefaultUIPreferences } from '@/data/defaults';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { CardSize, LayoutDensity, NumberFormat, TableView, TextSize, UIPreferences } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { AccentPicker } from './AccentPicker';
import { AppearancePreview } from './AppearancePreview';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SettingRow, SettingsSection } from './SettingsSection';
import { ThemeSelector } from './ThemeSwitcher';

/** Language, theme, number format, display size and UI preferences — applied instantly. */
export function AppearanceSettings() {
  const { t } = useTranslation();
  const numberFormat = useSettingsStore((state) => state.settings.numberFormat);
  const ui = useSettingsStore((state) => state.settings.ui);
  const setNumberFormat = useSettingsStore((state) => state.setNumberFormat);
  const updateUI = useSettingsStore((state) => state.updateUI);

  const report = (promise: Promise<void>) =>
    promise.catch((error: unknown) => toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed'))));
  const setPreference = <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => report(updateUI({ [key]: value }));

  const resetDisplay = () => {
    const { textSize, cardSize, accentColor, density } = createDefaultUIPreferences();
    void updateUI({ textSize, cardSize, accentColor, density }).then(
      () => toast.success(message('settings.appearance.resetDone')),
      (error: unknown) => toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed'))),
    );
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="min-w-0 space-y-6">
        <SettingsSection title={t('settings.appearance.title')} icon={<Palette className="size-5" aria-hidden />}>
          <SettingRow label={t('language.label')} hint={t('settings.appearance.languageHint')}>
            <LanguageSwitcher size="md" />
          </SettingRow>
          <SettingRow label={t('theme.label')} hint={t('settings.appearance.themeHint')}>
            <ThemeSelector />
          </SettingRow>
          <SettingRow label={t('numberFormat.label')} hint={t('settings.appearance.numberFormatHint')}>
            <SegmentedControl<NumberFormat>
              label={t('numberFormat.label')}
              value={numberFormat}
              onValueChange={(value) => void report(setNumberFormat(value))}
              options={[
                { value: 'western', label: t('numberFormat.western') },
                { value: 'bengali', label: t('numberFormat.bengali') },
              ]}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection
          title={t('settings.appearance.display')}
          icon={<ALargeSmall className="size-5" aria-hidden />}
          actions={
            <Button variant="ghost" size="sm" icon={<RotateCcw className="size-4" aria-hidden />} onClick={resetDisplay}>
              {t('settings.appearance.reset')}
            </Button>
          }
        >
          <SettingRow label={t('textSize.label')} hint={t('settings.appearance.textSizeHint')}>
            <SegmentedControl<TextSize>
              label={t('textSize.label')}
              value={ui.textSize}
              onValueChange={(value) => void setPreference('textSize', value)}
              options={TEXT_SIZES.map((size) => ({ value: size, label: t(`textSize.${size}`) }))}
            />
          </SettingRow>
          <SettingRow label={t('cardSize.label')} hint={t('settings.appearance.cardSizeHint')}>
            <SegmentedControl<CardSize>
              label={t('cardSize.label')}
              value={ui.cardSize}
              onValueChange={(value) => void setPreference('cardSize', value)}
              options={CARD_SIZES.map((size) => ({ value: size, label: t(`cardSize.${size}`) }))}
            />
          </SettingRow>
          <SettingRow label={t('accentColor.label')} hint={t('settings.appearance.accentHint')}>
            <AccentPicker value={ui.accentColor} onValueChange={(value) => void setPreference('accentColor', value)} />
          </SettingRow>
          <SettingRow label={t('density.label')} hint={t('settings.appearance.densityHint')}>
            <SegmentedControl<LayoutDensity>
              label={t('density.label')}
              value={ui.density}
              onValueChange={(value) => void setPreference('density', value)}
              options={LAYOUT_DENSITIES.map((density) => ({ value: density, label: t(`density.${density}`) }))}
            />
          </SettingRow>
          <SettingRow label={t('tables.view.label')} hint={t('settings.appearance.tableViewHint')}>
            <SegmentedControl<TableView>
              label={t('tables.view.label')}
              value={ui.tableView}
              onValueChange={(value) => void setPreference('tableView', value)}
              options={TABLE_VIEWS.map((view) => ({ value: view, label: t(`tables.view.${view}`) }))}
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title={t('settings.appearance.preferences')} icon={<SlidersHorizontal className="size-5" aria-hidden />}>
          <div className="divide-y divide-border">
            <Switch
              className="py-2"
              label={t('settings.appearance.showImages')}
              checked={ui.showItemImages}
              onCheckedChange={(checked) => void setPreference('showItemImages', checked)}
            />
            <Switch
              className="py-2"
              label={t('settings.appearance.soundEffects')}
              description={t('settings.appearance.soundEffectsHint')}
              checked={ui.soundEffects}
              onCheckedChange={(checked) => void setPreference('soundEffects', checked)}
            />
            <Switch
              className="py-2"
              label={t('settings.appearance.askGuestCount')}
              description={t('settings.appearance.askGuestCountHint')}
              checked={ui.askGuestCount}
              onCheckedChange={(checked) => void setPreference('askGuestCount', checked)}
            />
          </div>
        </SettingsSection>
      </div>

      <div className="xl:sticky xl:top-0">
        <SettingsSection
          title={t('settings.appearance.preview')}
          description={t('settings.appearance.previewHint')}
          icon={<Eye className="size-5" aria-hidden />}
        >
          <AppearancePreview />
        </SettingsSection>
      </div>
    </div>
  );
}

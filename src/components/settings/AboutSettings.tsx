import { Copy, ExternalLink, FlaskConical, Images, Info, Keyboard, Mail, RotateCcw, Trash, UserRound, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { ItemImage } from '@/components/common/ItemImage';
import { Kbd } from '@/components/common/Kbd';
import { AppLogo } from '@/components/layout/AppLogo';
import { APP_CONFIG, KEYBOARD_SHORTCUTS } from '@/config/app.config';
import { MENU_IMAGE_CREDITS } from '@/data/imageCredits';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { resetDemoData } from '@/services/dataActions';
import { loadSampleSales, removeSampleSales } from '@/services/sampleSalesActions';
import { useOrderStore } from '@/store/orderStore';
import { toast } from '@/store/uiStore';
import { copyText } from '@/utils/clipboard';
import type { AppInfo } from '../../../electron/types/electron';
import { SettingRow, SettingsSection } from './SettingsSection';

const SHORTCUT_ROWS = [
  { key: KEYBOARD_SHORTCUTS.goPos.label, label: 'shortcuts.pos' },
  { key: KEYBOARD_SHORTCUTS.goTables.label, label: 'shortcuts.tables' },
  { key: KEYBOARD_SHORTCUTS.goOrders.label, label: 'shortcuts.orders' },
  { key: KEYBOARD_SHORTCUTS.goReports.label, label: 'shortcuts.reports' },
  { key: `${KEYBOARD_SHORTCUTS.focusSearch.label} / ${KEYBOARD_SHORTCUTS.searchCombo.label}`, label: 'shortcuts.search' },
  { key: KEYBOARD_SHORTCUTS.refresh.label, label: 'shortcuts.refresh' },
  { key: KEYBOARD_SHORTCUTS.payment.label, label: 'shortcuts.payment' },
  { key: KEYBOARD_SHORTCUTS.closeModal.label, label: 'shortcuts.closeModal' },
  { key: `${KEYBOARD_SHORTCUTS.textLarger.label} / ${KEYBOARD_SHORTCUTS.textSmaller.label}`, label: 'shortcuts.textSize' },
  { key: KEYBOARD_SHORTCUTS.textReset.label, label: 'shortcuts.textReset' },
] as const;

type BusyAction = 'reset' | 'sample' | 'remove-sample';

const developer = APP_CONFIG.developer;

/** Version info, the developer, keyboard shortcuts, developer tools and photo credits. */
export function AboutSettings() {
  const { t } = useTranslation();
  const format = useFormatters();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const sampleCount = useOrderStore((state) => state.completedOrders.filter((order) => order.sample).length);

  useEffect(() => {
    let active = true;
    window.electronAPI?.app
      .getInfo()
      .then((value) => {
        if (active) setInfo(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const copyEmail = async () => {
    if (await copyText(developer.email)) toast.success(message('settings.about.emailCopied'));
    else toast.error(message('settings.about.copyFailed'));
  };

  const run = async (action: BusyAction, task: () => Promise<unknown>) => {
    setBusy(action);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection title={t('settings.about.title')} icon={<Info className="size-5" aria-hidden />}>
        <div className="flex items-center gap-4">
          <AppLogo size="lg" />
          <div>
            <p className="text-xl font-bold">{APP_CONFIG.name}</p>
            <p className="text-fg-muted">{APP_CONFIG.description}</p>
            <p className="text-sm text-fg-muted">
              {t('settings.about.appVersion')}: {info?.version ?? APP_CONFIG.version}
            </p>
            {info && (
              <p className="text-sm text-fg-subtle">
                {t('settings.about.runtime')}: Electron {info.electronVersion} · Chromium {info.chromeVersion} · Node {info.nodeVersion} ·{' '}
                {info.platform}/{info.arch}
              </p>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.about.madeBy')} icon={<UserRound className="size-5" aria-hidden />}>
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-2xl font-extrabold tracking-wide text-primary-fg shadow-md"
          >
            {developer.initials}
          </span>
          <dl className="min-w-0 flex-1 space-y-0.5">
            <dt className="sr-only">{t('common.name')}</dt>
            <dd className="text-xl font-bold selectable">{developer.name}</dd>
            <dt className="sr-only">{t('settings.about.designation')}</dt>
            <dd className="text-fg-muted">{format.text(developer.designation)}</dd>
            <dt className="sr-only">{t('settings.about.email')}</dt>
            <dd className="flex min-w-0 items-center gap-2 pt-1 text-sm">
              <Mail className="size-4 shrink-0 text-primary-text" aria-hidden />
              <span className="truncate font-medium selectable">{developer.email}</span>
            </dd>
          </dl>
          <Button variant="secondary" icon={<Copy className="size-5" aria-hidden />} onClick={() => void copyEmail()}>
            {t('settings.about.copyEmail')}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t('settings.about.shortcuts')} icon={<Keyboard className="size-5" aria-hidden />}>
        <dl className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          {SHORTCUT_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border py-2">
              <dt>{t(row.label)}</dt>
              <dd>
                <Kbd>{row.key}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      <SettingsSection title={t('settings.about.developer')} icon={<Wrench className="size-5" aria-hidden />}>
        <SettingRow
          label={t('settings.about.sampleSales')}
          hint={[
            t('settings.about.sampleHint', { days: APP_CONFIG.reports.sampleDays }),
            sampleCount > 0 ? t('settings.about.sampleLoadedCount', { count: sampleCount }) : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="flex flex-wrap justify-end gap-2">
            {sampleCount > 0 && (
              <Button
                variant="danger-soft"
                icon={<Trash className="size-5" aria-hidden />}
                onClick={() => void run('remove-sample', removeSampleSales)}
                loading={busy === 'remove-sample'}
                disabled={busy !== null && busy !== 'remove-sample'}
              >
                {t('settings.about.removeSample')}
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<FlaskConical className="size-5" aria-hidden />}
              onClick={() => void run('sample', loadSampleSales)}
              loading={busy === 'sample'}
              disabled={busy !== null && busy !== 'sample'}
            >
              {sampleCount > 0 ? t('settings.about.reloadSample') : t('settings.about.loadSample')}
            </Button>
          </div>
        </SettingRow>
        <SettingRow label={t('settings.about.resetDemo')} hint={t('settings.about.resetHint')}>
          <Button
            variant="danger"
            icon={<RotateCcw className="size-5" aria-hidden />}
            onClick={() => void run('reset', resetDemoData)}
            loading={busy === 'reset'}
            disabled={busy !== null && busy !== 'reset'}
          >
            {t('settings.about.resetDemo')}
          </Button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title={t('settings.about.imageCredits')}
        description={t('settings.about.imageCreditsHint')}
        icon={<Images className="size-5" aria-hidden />}
      >
        <ul className="grid gap-x-6 gap-y-3 lg:grid-cols-2">
          {MENU_IMAGE_CREDITS.map((credit) => (
            <li key={credit.code} className="flex min-w-0 items-center gap-3">
              <span className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                <ItemImage src={credit.file} className="size-full object-cover" fallback={null} />
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold">{credit.name}</p>
                <p className="truncate text-xs text-fg-muted selectable">
                  {credit.creator || t('settings.about.unknownAuthor')} · {credit.license}
                </p>
                <p className="flex min-w-0 items-center gap-1 text-xs text-fg-subtle selectable">
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{credit.source}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}

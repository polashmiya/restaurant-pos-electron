import { Database, Download, FolderOpen, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/common/Notice';
import { exportData, importData, openDataFolder } from '@/services/dataActions';
import { isDesktopRuntime } from '@/services/storage';
import { SettingRow, SettingsSection } from './SettingsSection';

/** Local JSON backup and restore (nothing is uploaded). */
export function DataSettings() {
  const { t } = useTranslation();
  const desktop = isDesktopRuntime();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [dataPath, setDataPath] = useState('');

  useEffect(() => {
    let active = true;
    window.electronAPI?.app
      .getInfo()
      .then((info) => {
        if (active) setDataPath(info.userDataPath);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const run = async (action: 'export' | 'import', job: () => Promise<void>) => {
    setBusy(action);
    try {
      await job();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsSection
      title={t('settings.data.title')}
      description={t('settings.data.description')}
      icon={<Database className="size-5" aria-hidden />}
    >
      {!desktop && (
        <Notice tone="warning" className="mb-4">
          {t('settings.data.desktopOnly')}
        </Notice>
      )}
      <SettingRow label={t('settings.data.export')} hint={t('settings.data.exportHint')}>
        <Button
          variant="primary"
          icon={<Download className="size-5" aria-hidden />}
          onClick={() => void run('export', exportData)}
          loading={busy === 'export'}
          disabled={!desktop || busy !== null}
        >
          {t('settings.data.export')}
        </Button>
      </SettingRow>
      <SettingRow label={t('settings.data.import')} hint={t('settings.data.importHint')}>
        <Button
          variant="danger-soft"
          icon={<Upload className="size-5" aria-hidden />}
          onClick={() => void run('import', importData)}
          loading={busy === 'import'}
          disabled={!desktop || busy !== null}
        >
          {t('settings.data.import')}
        </Button>
      </SettingRow>
      {desktop && (
        <SettingRow
          label={t('settings.data.location')}
          hint={<span className="font-mono text-xs break-all selectable">{dataPath}</span>}
        >
          <Button variant="secondary" icon={<FolderOpen className="size-5" aria-hidden />} onClick={() => void openDataFolder()}>
            {t('settings.data.openFolder')}
          </Button>
        </SettingRow>
      )}
    </SettingsSection>
  );
}

import { Box, Grid2x2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { TABLE_VIEWS } from '@/config/app.config';
import { message } from '@/i18n/keys';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from '@/store/uiStore';
import type { TableView } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { TableGrid } from './TableGrid';
import { TableStatusFilter, type TableFilter } from './TableStatusFilter';

const VIEW_ICONS = { iso: Box, plan: Grid2x2 } as const;

/** Dining floor: every table with its live status (F2). */
export function TablesPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TableFilter>('all');
  const view = useSettingsStore((state) => state.settings.ui.tableView);
  const updateUI = useSettingsStore((state) => state.updateUI);

  const changeView = (next: TableView) =>
    updateUI({ tableView: next }).catch((error: unknown) =>
      toast.error(message(getErrorMessageKey(error, 'errors.settingsSaveFailed'))),
    );

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border bg-surface px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('tables.title')}</h1>
            <p className="text-fg-muted">{t('tables.subtitle')}</p>
          </div>
          <SegmentedControl<TableView>
            label={t('tables.view.label')}
            value={view}
            onValueChange={(next) => void changeView(next)}
            size="sm"
            options={TABLE_VIEWS.map((option) => {
              const Icon = VIEW_ICONS[option];
              return { value: option, label: t(`tables.view.${option}`), icon: <Icon className="size-4" aria-hidden /> };
            })}
          />
        </div>
        <TableStatusFilter value={filter} onChange={setFilter} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <TableGrid filter={filter} />
      </div>
    </div>
  );
}

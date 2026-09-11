import { message } from '@/i18n/keys';
import { getFormatContext } from '@/store/settingsStore';
import { confirmAction, toast } from '@/store/uiStore';
import { logError } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';
import { replaceApplicationData } from './bootstrap';
import { getStorage } from './storage';

/* ==========================================================================
   Backup / restore / reset (master spec §75, §99). Every destructive action
   asks for confirmation, and the main process writes a safety copy of the
   current data before replacing anything.
   ========================================================================== */

export async function exportData(): Promise<void> {
  const api = window.electronAPI;
  if (!api) return;
  try {
    const result = await api.data.exportBackup();
    if (result.ok) toast.success(message('settings.data.exported', { path: result.filePath }), 8000);
    else if (result.reason === 'failed') toast.error(message('errors.exportFailed'));
  } catch (error) {
    logError('export', error);
    toast.error(message('errors.exportFailed'));
  }
}

/** Pick → validate (main process) → confirm with a summary → replace all data. */
export async function importData(): Promise<void> {
  const api = window.electronAPI;
  if (!api) return;
  try {
    const picked = await api.data.pickImport();
    if (!picked.ok) {
      if (picked.reason === 'invalid') toast.error(message('settings.data.invalidFile'));
      else if (picked.reason === 'failed') toast.error(message('errors.importFailed'));
      return;
    }
    const { summary } = picked;
    const confirmed = await confirmAction({
      title: message('settings.data.importTitle'),
      message: message('settings.data.importMessage', {
        date: formatDateTime(summary.exportedAt, getFormatContext()),
        orders: summary.completedOrders,
        items: summary.menuItems,
      }),
      confirmLabel: message('settings.data.importConfirm'),
      tone: 'danger',
    });
    if (!confirmed) return;

    const applied = await api.data.applyImport(picked.token);
    if (!applied.ok) {
      toast.error(message('errors.importFailed'));
      return;
    }
    await replaceApplicationData(applied.data);
    toast.success(message('settings.data.imported'));
  } catch (error) {
    logError('import', error);
    toast.error(message('errors.importFailed'));
  }
}

/** Clears orders and shifts, restores the demo menu, tables and default settings. */
export async function resetDemoData(): Promise<boolean> {
  const confirmed = await confirmAction({
    title: message('settings.about.resetTitle'),
    message: message('settings.about.resetMessage'),
    confirmLabel: message('settings.about.resetConfirm'),
    tone: 'danger',
  });
  if (!confirmed) return false;
  try {
    const data = await getStorage().reset();
    await replaceApplicationData(data);
    toast.success(message('settings.about.resetDone'));
    return true;
  } catch (error) {
    logError('reset', error);
    toast.error(message('errors.resetFailed'));
    return false;
  }
}

export async function openDataFolder(): Promise<void> {
  try {
    await window.electronAPI?.app.openDataFolder();
  } catch (error) {
    logError('open-data-folder', error);
    toast.error(message('errors.unexpected'));
  }
}

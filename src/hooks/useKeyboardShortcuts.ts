import { useEffect } from 'react';
import { hasOpenModal } from '@/components/common/modalStack';
import { KEYBOARD_SHORTCUTS } from '@/config/app.config';
import { message } from '@/i18n/keys';
import { refreshApplicationData } from '@/services/bootstrap';
import { attempt } from '@/services/actionRunner';
import { stepTextSize } from '@/services/appearanceActions';
import { requestPayment } from '@/services/posActions';
import { toast, useUIStore } from '@/store/uiStore';

function focusSearch(): void {
  const ui = useUIStore.getState();
  ui.navigate('pos');
  ui.requestSearchFocus();
}

async function refresh(): Promise<void> {
  if (await attempt('refresh', refreshApplicationData)) toast.success(message('toast.dataRefreshed'));
}

function textSizeStep(key: string): -1 | 0 | 1 | null {
  if ((KEYBOARD_SHORTCUTS.textLarger.keys as readonly string[]).includes(key)) return 1;
  if ((KEYBOARD_SHORTCUTS.textSmaller.keys as readonly string[]).includes(key)) return -1;
  if ((KEYBOARD_SHORTCUTS.textReset.keys as readonly string[]).includes(key)) return 0;
  return null;
}

/**
 * Global shortcuts (master spec §45):
 * F1 POS · F2 Tables · F3 Orders · F4 / Ctrl+K search · F5 refresh ·
 * F6 Reports · F9 payment · Esc closes the top dialog (handled by <Modal>) ·
 * Ctrl + / Ctrl − / Ctrl 0 text size. Navigation shortcuts pause while a
 * dialog is open.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const ui = useUIStore.getState();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === KEYBOARD_SHORTCUTS.searchCombo.key) {
        event.preventDefault();
        if (!hasOpenModal()) focusSearch();
        return;
      }
      const textStep = modifier && !event.altKey ? textSizeStep(event.key) : null;
      if (textStep !== null) {
        // Works everywhere, dialogs included: it only changes the display.
        event.preventDefault();
        void stepTextSize(textStep);
        return;
      }
      if (modifier || event.altKey) return;

      const isShortcut = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F9'].includes(event.key);
      if (!isShortcut) return;
      // Always stop browser defaults (help, find, reload) for these keys.
      event.preventDefault();
      if (hasOpenModal()) return;

      switch (event.key) {
        case KEYBOARD_SHORTCUTS.goPos.key:
          ui.navigate('pos');
          break;
        case KEYBOARD_SHORTCUTS.goTables.key:
          ui.navigate('tables');
          break;
        case KEYBOARD_SHORTCUTS.goOrders.key:
          ui.navigate('orders');
          break;
        case KEYBOARD_SHORTCUTS.focusSearch.key:
          focusSearch();
          break;
        case KEYBOARD_SHORTCUTS.refresh.key:
          void refresh();
          break;
        case KEYBOARD_SHORTCUTS.goReports.key:
          ui.navigate('reports');
          break;
        case KEYBOARD_SHORTCUTS.payment.key:
          if (ui.activePage !== 'pos') ui.navigate('pos');
          void requestPayment();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

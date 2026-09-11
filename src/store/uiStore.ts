import { create } from 'zustand';
import { APP_CONFIG } from '@/config/app.config';
import type { TranslatableMessage, TranslationKey } from '@/i18n/keys';
import type { PrintDocument, PrintKind } from '@/types';
import { createId } from '@/utils/id';

export type PageId = 'pos' | 'tables' | 'orders' | 'reports' | 'shift' | 'settings';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: TranslatableMessage;
  durationMs: number;
}

export type ConfirmTone = 'danger' | 'primary';

export interface ConfirmRequest {
  title: TranslatableMessage;
  message: TranslatableMessage;
  confirmLabel?: TranslatableMessage;
  cancelLabel?: TranslatableMessage;
  tone?: ConfirmTone;
}

interface PendingConfirm extends ConfirmRequest {
  id: string;
  resolve: (confirmed: boolean) => void;
}

/** Application dialogs rendered by <ModalHost />. */
export type AppModal =
  | { type: 'payment' }
  | { type: 'discount' }
  | { type: 'tablePicker' }
  | { type: 'guestCount' }
  | { type: 'heldOrders' }
  | { type: 'itemNote'; lineId: string }
  | { type: 'printPreview'; orderId: string; document: PrintKind; justCompleted?: boolean }
  /** Print dialog opened by an action that waits for it (see openPrintDialog). */
  | { type: 'print'; requestId: string; document: PrintDocument; successKey: TranslationKey }
  | { type: 'orderDetails'; orderId: string }
  | { type: 'openShift'; thenOpenPayment?: boolean }
  | { type: 'closeShift' }
  | { type: 'shiftReport'; shiftId: string }
  | { type: 'salesReport'; start: string; end: string }
  | { type: 'tableActions'; tableId: string }
  | { type: 'reserveTable'; tableId: string };

interface UIState {
  activePage: PageId;
  modalStack: AppModal[];
  toasts: Toast[];
  confirmQueue: PendingConfirm[];
  /** Incremented to ask the POS search box to focus itself. */
  searchFocusToken: number;
  /** Cart drawer visibility on narrow screens. */
  isCartDrawerOpen: boolean;

  navigate: (page: PageId) => void;

  openModal: (modal: AppModal) => void;
  replaceModal: (modal: AppModal) => void;
  closeModal: () => void;
  closeAllModals: () => void;

  showToast: (tone: ToastTone, message: TranslatableMessage, durationMs?: number) => string;
  dismissToast: (id: string) => void;

  confirm: (request: ConfirmRequest) => Promise<boolean>;
  resolveConfirm: (id: string, confirmed: boolean) => void;

  requestSearchFocus: () => void;
  setCartDrawerOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  activePage: 'pos',
  modalStack: [],
  toasts: [],
  confirmQueue: [],
  searchFocusToken: 0,
  isCartDrawerOpen: false,

  navigate: (page) => set({ activePage: page, isCartDrawerOpen: false }),

  openModal: (modal) => set((state) => ({ modalStack: [...state.modalStack, modal] })),
  replaceModal: (modal) => set((state) => ({ modalStack: [...state.modalStack.slice(0, -1), modal] })),
  closeModal: () => set((state) => ({ modalStack: state.modalStack.slice(0, -1) })),
  closeAllModals: () => set({ modalStack: [] }),

  showToast: (tone, message, durationMs) => {
    const id = createId('toast');
    const duration =
      durationMs ?? (tone === 'error' ? APP_CONFIG.ui.errorToastDurationMs : APP_CONFIG.ui.toastDurationMs);
    // Keep the stack short so notifications never cover the POS.
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, tone, message, durationMs: duration }] }));
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  confirm: (request) =>
    new Promise<boolean>((resolve) => {
      const id = createId('confirm');
      set((state) => ({ confirmQueue: [...state.confirmQueue, { ...request, id, resolve }] }));
    }),
  resolveConfirm: (id, confirmed) => {
    const pending = get().confirmQueue.find((entry) => entry.id === id);
    set((state) => ({ confirmQueue: state.confirmQueue.filter((entry) => entry.id !== id) }));
    pending?.resolve(confirmed);
  },

  requestSearchFocus: () => set((state) => ({ searchFocusToken: state.searchFocusToken + 1 })),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
}));

/** Convenience helpers usable outside React components. */
export const toast = {
  success: (message: TranslatableMessage, durationMs?: number) =>
    useUIStore.getState().showToast('success', message, durationMs),
  error: (message: TranslatableMessage, durationMs?: number) =>
    useUIStore.getState().showToast('error', message, durationMs),
  info: (message: TranslatableMessage, durationMs?: number) =>
    useUIStore.getState().showToast('info', message, durationMs),
  warning: (message: TranslatableMessage, durationMs?: number) =>
    useUIStore.getState().showToast('warning', message, durationMs),
};

export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  return useUIStore.getState().confirm(request);
}

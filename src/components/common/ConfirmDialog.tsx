import { CircleQuestionMark, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TranslatableMessage } from '@/i18n/keys';
import { useUIStore, type ConfirmTone } from '@/store/uiStore';
import { cn } from '@/utils/cn';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reusable, localized confirmation dialog. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Icon = tone === 'danger' ? TriangleAlert : CircleQuestionMark;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full',
            tone === 'danger' ? 'bg-danger/15 text-danger-text' : 'bg-primary/15 text-primary-text',
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="pt-2 text-base leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
}

/** Renders confirmations requested through `confirmAction()` (one at a time). */
export function ConfirmHost() {
  const { t } = useTranslation();
  const pending = useUIStore((state) => state.confirmQueue[0]);
  const resolveConfirm = useUIStore((state) => state.resolveConfirm);

  if (!pending) return null;

  const translate = (value: TranslatableMessage | undefined, fallback: TranslatableMessage) => {
    const resolved = value ?? fallback;
    return t(resolved.key, resolved.params ?? {});
  };

  return (
    <ConfirmDialog
      key={pending.id}
      open
      tone={pending.tone}
      title={translate(pending.title, { key: 'common.confirm' })}
      message={translate(pending.message, { key: 'common.confirm' })}
      confirmLabel={translate(pending.confirmLabel, { key: 'common.confirm' })}
      cancelLabel={translate(pending.cancelLabel, { key: 'common.cancel' })}
      onConfirm={() => resolveConfirm(pending.id, true)}
      onCancel={() => resolveConfirm(pending.id, false)}
    />
  );
}

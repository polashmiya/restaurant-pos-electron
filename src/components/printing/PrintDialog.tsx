import { FileDown, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { usePrintJob } from '@/hooks/usePrintJob';
import type { TranslationKey } from '@/i18n/keys';
import type { PrintDocument } from '@/types';
import { DocumentPreview } from './DocumentPreview';
import { PrintOptions } from './PrintOptions';

export interface PrintDialogProps {
  document: PrintDocument;
  title: ReactNode;
  description?: ReactNode;
  /** Toast shown after a successful print. */
  successKey: TranslationKey;
  /** Label of the Print button (defaults to "Print"). */
  printLabel?: string;
  onClose: () => void;
  /** Runs after the document was printed or saved as PDF. */
  onDone?: () => void;
}

/**
 * The app's print dialog: live preview of the document, printer and copies,
 * Save as PDF and Print. Printing then goes straight to the chosen printer.
 */
export function PrintDialog({ document, title, description, successKey, printLabel, onClose, onDone }: PrintDialogProps) {
  const { t } = useTranslation();
  const job = usePrintJob(document, successKey, onDone);

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      dismissible={job.busy === null}
      footer={
        <>
          <Button
            variant="outline"
            icon={<FileDown className="size-5" aria-hidden />}
            onClick={() => void job.savePdf()}
            loading={job.busy === 'pdf'}
            disabled={job.busy === 'print'}
            className="me-auto"
          >
            {t('print.savePdf')}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={job.busy !== null}>
            {t('common.close')}
          </Button>
          <Button
            variant="primary"
            icon={<Printer className="size-5" aria-hidden />}
            onClick={() => void job.print()}
            loading={job.busy === 'print'}
            disabled={job.busy === 'pdf'}
            data-autofocus
          >
            {printLabel ?? t('common.print')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <PrintOptions job={job} />
        <DocumentPreview document={document} target={job.target} />
      </div>
    </Modal>
  );
}

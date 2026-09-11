import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/i18n/keys';
import { settlePrintDialog } from '@/services/printActions';
import type { PrintDocument } from '@/types';
import { PrintDialog } from './PrintDialog';

export interface PrintRequestModalProps {
  requestId: string;
  document: PrintDocument;
  successKey: TranslationKey;
  onClose: () => void;
}

/**
 * Print dialog for a POS action that waits for the result (KOT, bill, test
 * page): it closes by itself once the document was printed or saved.
 */
export function PrintRequestModal({ requestId, document, successKey, onClose }: PrintRequestModalProps) {
  const { t } = useTranslation();

  const description = (() => {
    switch (document.type) {
      case 'receipt':
        return `${t(document.variant === 'bill' ? 'print.bill' : 'print.receipt')} · ${document.order.orderNumber}`;
      case 'kot':
        return `${t('print.kot')} · ${document.order.orderNumber}`;
      case 'test':
        return t('print.testPage');
      default:
        return undefined;
    }
  })();

  return (
    <PrintDialog
      document={document}
      title={t('print.dialogTitle')}
      description={description}
      successKey={successKey}
      onClose={onClose}
      onDone={() => {
        settlePrintDialog(requestId, true);
        onClose();
      }}
    />
  );
}

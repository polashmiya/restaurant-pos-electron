import { ChefHat, CircleCheckBig, FileDown, Printer, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { LANGUAGES } from '@/config/app.config';
import { useFormatters } from '@/hooks/useFormatters';
import { usePrintJob } from '@/hooks/usePrintJob';
import { kotDocument, receiptDocument } from '@/services/printService';
import { useOrder } from '@/store/orderStore';
import type { Language, Order, PrintKind } from '@/types';
import { DocumentPreview } from './DocumentPreview';
import { PrintOptions } from './PrintOptions';

export interface PrintPreviewModalProps {
  orderId: string;
  document: PrintKind;
  /** Opened right after a payment (not a reprint). */
  justCompleted?: boolean;
  onClose: () => void;
}

/**
 * Receipt / KOT print dialog for an order. Documents default to the language
 * the order was completed in; the cashier may pick another language for a
 * reprint (master spec §13).
 */
export function PrintPreviewModal({ orderId, document, justCompleted = false, onClose }: PrintPreviewModalProps) {
  const order = useOrder(orderId);

  useEffect(() => {
    if (!order) onClose();
  }, [order, onClose]);

  if (!order) return null;
  return <OrderPrintDialog order={order} initialKind={document} justCompleted={justCompleted} onClose={onClose} />;
}

interface OrderPrintDialogProps {
  order: Order;
  initialKind: PrintKind;
  justCompleted: boolean;
  onClose: () => void;
}

function OrderPrintDialog({ order, initialKind, justCompleted, onClose }: OrderPrintDialogProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const [kind, setKind] = useState<PrintKind>(initialKind);
  const [language, setLanguage] = useState<Language>(order.language);

  const reprint = !justCompleted;
  const printDocument = kind === 'receipt' ? receiptDocument(order, { language, reprint }) : kotDocument(order, { language, reprint });
  const job = usePrintJob(printDocument, kind === 'receipt' ? 'print.receiptPrinted' : 'print.kotPrinted');
  const changeDue = order.payment?.method === 'cash' ? order.payment.change : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={kind === 'receipt' ? t('print.receiptPreview') : t('print.kotPreview')}
      description={order.orderNumber}
      size="lg"
      dismissible={job.busy === null}
      footer={
        <>
          <Button
            variant="outline"
            size="lg"
            icon={<FileDown className="size-5" aria-hidden />}
            onClick={() => void job.savePdf()}
            loading={job.busy === 'pdf'}
            disabled={job.busy === 'print'}
            className="me-auto"
          >
            {t('print.savePdf')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={<Printer className="size-5" aria-hidden />}
            onClick={() => void job.print()}
            loading={job.busy === 'print'}
            disabled={job.busy === 'pdf'}
            data-autofocus
          >
            {kind === 'receipt' ? t('print.printReceipt') : t('print.printKot')}
          </Button>
          <Button variant={justCompleted ? 'success' : 'secondary'} size="lg" onClick={onClose} disabled={job.busy !== null}>
            {justCompleted ? t('print.newOrder') : t('common.close')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-4">
          {justCompleted && (
            <div role="status" className="rounded-card border-2 border-success/50 bg-success/10 p-4">
              <p className="flex items-center gap-2 text-lg font-bold text-success-text">
                <CircleCheckBig className="size-6" aria-hidden />
                {t('payment.success')}
              </p>
              {changeDue > 0 && (
                <p className="mt-2 text-3xl font-extrabold tabular-nums">
                  {t('payment.changeDue', { amount: format.currency(changeDue) })}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('print.documentType')}</p>
            <SegmentedControl<PrintKind>
              label={t('print.documentType')}
              value={kind}
              onValueChange={setKind}
              fullWidth
              options={[
                { value: 'receipt', label: t('print.receipt'), icon: <ReceiptText className="size-4" aria-hidden /> },
                { value: 'kot', label: t('print.kot'), icon: <ChefHat className="size-4" aria-hidden /> },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('print.receiptLanguage')}</p>
            <SegmentedControl<Language>
              label={t('print.receiptLanguage')}
              value={language}
              onValueChange={setLanguage}
              fullWidth
              options={LANGUAGES.map((option) => ({
                value: option.code,
                label: <span lang={option.code}>{option.nativeName}</span>,
                ariaLabel: option.nativeName,
              }))}
            />
          </div>

          <PrintOptions job={job} />
        </div>

        <DocumentPreview document={printDocument} target={job.target} />
      </div>
    </Modal>
  );
}

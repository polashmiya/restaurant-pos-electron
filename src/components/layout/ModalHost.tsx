import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { DiscountModal } from '@/components/pos/DiscountModal';
import { GuestCountModal } from '@/components/pos/GuestCountModal';
import { PrintPreviewModal } from '@/components/printing/PrintPreviewModal';
import { PrintRequestModal } from '@/components/printing/PrintRequestModal';
import { HeldOrdersModal } from '@/components/pos/HeldOrdersModal';
import { ItemNoteModal } from '@/components/pos/ItemNoteModal';
import { TablePickerModal } from '@/components/pos/TablePickerModal';
import { SalesReportModal } from '@/components/reports/SalesReportModal';
import { CloseShiftModal } from '@/components/shift/CloseShiftModal';
import { OpenShiftModal } from '@/components/shift/OpenShiftModal';
import { ShiftReportModal } from '@/components/shift/ShiftReportModal';
import { ReserveTableModal } from '@/components/tables/ReserveTableModal';
import { TableActionsModal } from '@/components/tables/TableActionsModal';
import { useUIStore, type AppModal } from '@/store/uiStore';

function renderModal(modal: AppModal, close: () => void) {
  switch (modal.type) {
    case 'payment':
      return <PaymentModal onClose={close} />;
    case 'printPreview':
      return (
        <PrintPreviewModal
          orderId={modal.orderId}
          document={modal.document}
          justCompleted={modal.justCompleted}
          onClose={close}
        />
      );
    case 'print':
      return (
        <PrintRequestModal requestId={modal.requestId} document={modal.document} successKey={modal.successKey} onClose={close} />
      );
    case 'discount':
      return <DiscountModal onClose={close} />;
    case 'itemNote':
      return <ItemNoteModal lineId={modal.lineId} onClose={close} />;
    case 'tablePicker':
      return <TablePickerModal onClose={close} />;
    case 'guestCount':
      return <GuestCountModal onClose={close} />;
    case 'heldOrders':
      return <HeldOrdersModal onClose={close} />;
    case 'openShift':
      return <OpenShiftModal thenOpenPayment={modal.thenOpenPayment} onClose={close} />;
    case 'closeShift':
      return <CloseShiftModal onClose={close} />;
    case 'shiftReport':
      return <ShiftReportModal shiftId={modal.shiftId} onClose={close} />;
    case 'salesReport':
      return <SalesReportModal start={modal.start} end={modal.end} onClose={close} />;
    case 'orderDetails':
      return <OrderDetailsModal orderId={modal.orderId} onClose={close} />;
    case 'tableActions':
      return <TableActionsModal tableId={modal.tableId} onClose={close} />;
    case 'reserveTable':
      return <ReserveTableModal tableId={modal.tableId} onClose={close} />;
    default:
      return null;
  }
}

/** Renders the dialog stack held in the UI store (top-most last). */
export function ModalHost() {
  const stack = useUIStore((state) => state.modalStack);
  const closeModal = useUIStore((state) => state.closeModal);
  return (
    <>
      {stack.map((modal, index) => (
        <ModalSlot key={`${index}-${modal.type}`} modal={modal} close={closeModal} />
      ))}
    </>
  );
}

function ModalSlot({ modal, close }: { modal: AppModal; close: () => void }) {
  return renderModal(modal, close);
}

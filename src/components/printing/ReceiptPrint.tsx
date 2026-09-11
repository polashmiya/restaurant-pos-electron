import type { Order, ReceiptVariant } from '@/types';
import { calculateLineTotal, getUniformTaxRate } from '@/utils/calculations';
import type { DocumentContext } from './documentTypes';
import { paperClass } from './printStyles';

export interface ReceiptPrintProps {
  order: Order;
  context: DocumentContext;
  /** `bill` = pre-payment bill for the table; `receipt` = paid receipt. */
  variant?: ReceiptVariant;
  reprint?: boolean;
  /** Time printed on bills (receipts use the completion time). */
  printedAt?: string;
}

/**
 * 80 mm customer receipt (master spec §35, §70, §95). Pure markup — rendered
 * to static HTML for printing and shown as-is in the preview.
 */
export function ReceiptPrint({ order, context, variant = 'receipt', reprint = false, printedAt }: ReceiptPrintProps) {
  const { t, format, restaurant, language, paperWidth } = context;
  const stamp = variant === 'bill' ? (printedAt ?? new Date().toISOString()) : (order.completedAt ?? order.cancelledAt ?? order.createdAt);
  const taxRate = getUniformTaxRate(order.items, order.taxRate);
  const address = format.text(restaurant.address);
  const footer = format.text(restaurant.footer);
  const heading =
    variant === 'bill' ? t('receipt.bill') : order.status === 'cancelled' ? t('receipt.cancelled') : t('receipt.title');
  const discountLabel =
    order.discountInput?.type === 'percentage'
      ? `${t('receipt.discount')} (${format.percent(order.discountInput.value)})`
      : t('receipt.discount');

  return (
    <div className={paperClass(paperWidth)} lang={language} data-document="receipt">
      <header className="c">
        <p className="title">{format.text(restaurant.name)}</p>
        {address && <p className="small">{address}</p>}
        {restaurant.phone && (
          <p className="small">
            {t('receipt.phone')}: {format.digits(restaurant.phone)}
          </p>
        )}
        {restaurant.taxId && (
          <p className="small">
            {t('receipt.taxId')}: {restaurant.taxId}
          </p>
        )}
      </header>

      <hr />
      <p className="heading">{heading}</p>
      {reprint && (
        <p className="c">
          <span className="badge">{t('receipt.reprint')}</span>
        </p>
      )}

      <table className="meta">
        <tbody>
          <tr>
            <th>{t('receipt.order')}</th>
            <td>{order.orderNumber}</td>
          </tr>
          <tr>
            <th>{t('receipt.date')}</th>
            <td>{format.date(stamp)}</td>
          </tr>
          <tr>
            <th>{t('receipt.time')}</th>
            <td>{format.time(stamp)}</td>
          </tr>
          <tr>
            <th>{t('receipt.type')}</th>
            <td>{t(`orderType.${order.orderType}`)}</td>
          </tr>
          {order.tableName && (
            <tr>
              <th>{t('receipt.table')}</th>
              <td>{format.digits(order.tableName)}</td>
            </tr>
          )}
          {order.guests && (
            <tr>
              <th>{t('receipt.guests')}</th>
              <td>{format.number(order.guests)}</td>
            </tr>
          )}
          {order.customer && (
            <>
              <tr>
                <th>{t('receipt.customer')}</th>
                <td>{order.customer.name}</td>
              </tr>
              <tr>
                <th>{t('receipt.phone')}</th>
                <td>{format.digits(order.customer.phone)}</td>
              </tr>
              {order.customer.address && (
                <tr>
                  <th>{t('receipt.address')}</th>
                  <td>{order.customer.address}</td>
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>

      <hr />
      <table>
        <thead>
          <tr>
            <th>{t('receipt.item')}</th>
            <th className="qty">{t('receipt.qty')}</th>
            <th className="num">{t('receipt.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="item-name">{format.text(item.name)}</span>
                <span className="item-sub">
                  {t('receipt.price')}: {format.currency(item.price)}
                </span>
              </td>
              <td className="qty">{format.number(item.quantity)}</td>
              <td className="num">{format.currency(calculateLineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <table>
        <tbody>
          <tr>
            <td>{t('receipt.subtotal')}</td>
            <td className="num">{format.currency(order.subtotal)}</td>
          </tr>
          {order.discount > 0 && (
            <tr>
              <td>{discountLabel}</td>
              <td className="num">- {format.currency(order.discount)}</td>
            </tr>
          )}
          <tr>
            <td>{taxRate !== null ? `${t('receipt.tax')} (${format.percent(taxRate)})` : t('receipt.tax')}</td>
            <td className="num">{format.currency(order.tax)}</td>
          </tr>
        </tbody>
      </table>
      <hr className="double" />
      <table>
        <tbody>
          <tr className="total">
            <td>{t('receipt.total')}</td>
            <td className="num">{format.currency(order.total)}</td>
          </tr>
        </tbody>
      </table>

      {order.payment && variant === 'receipt' && (
        <>
          <hr />
          <table>
            <tbody>
              <tr>
                <td>{t('receipt.paymentMethod')}</td>
                <td className="num">{t(`paymentMethod.${order.payment.method}`)}</td>
              </tr>
              <tr>
                <td>{t('receipt.paid')}</td>
                <td className="num">{format.currency(order.payment.amountPaid)}</td>
              </tr>
              <tr>
                <td>{t('receipt.change')}</td>
                <td className="num">{format.currency(order.payment.change)}</td>
              </tr>
              {order.payment.reference && (
                <tr>
                  <td>{t('receipt.reference')}</td>
                  <td className="num">{order.payment.reference}</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {variant === 'bill' && (
        <p className="c strong gap-top">{t('receipt.unpaid')}</p>
      )}

      <hr />
      {order.cashierName && (
        <p className="small">
          {t('receipt.cashier')}: {order.cashierName}
        </p>
      )}
      <footer className="c">
        <p className="thanks">{t('receipt.thankYou')}</p>
        {footer && <p className="small">{footer}</p>}
      </footer>
    </div>
  );
}

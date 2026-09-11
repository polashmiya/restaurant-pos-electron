import type { Order, OrderItem } from '@/types';
import { calculateLineTotal } from '@/utils/calculations';
import { sumMoney } from '@/utils/money';
import type { DocumentContext } from './documentTypes';
import { paperClass } from './printStyles';

export interface KOTPrintProps {
  order: Order;
  /** Lines to prepare (defaults to every item of the order). */
  items?: OrderItem[];
  context: DocumentContext;
  /** Sequence number of this ticket for the order. */
  ticketNumber?: number;
  /** Items added after an earlier KOT. */
  additional?: boolean;
  reprint?: boolean;
  showPrices?: boolean;
  printedAt?: string;
}

/**
 * Kitchen Order Ticket (master spec §36): large, high-contrast quantities,
 * item names and notes. Prices are hidden unless enabled in Settings.
 */
export function KOTPrint({
  order,
  items = order.items,
  context,
  ticketNumber,
  additional = false,
  reprint = false,
  showPrices = false,
  printedAt,
}: KOTPrintProps) {
  const { t, format, language, paperWidth } = context;
  const stamp = printedAt ?? new Date().toISOString();
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = sumMoney(items.map(calculateLineTotal));

  return (
    <div className={paperClass(paperWidth)} lang={language} data-document="kot">
      <p className="heading" style={{ fontSize: 16 }}>
        {t('kot.title')}
      </p>
      <p className="c">
        {ticketNumber !== undefined && <span className="badge">{t('kot.ticket', { count: ticketNumber })}</span>}
        {additional && <span className="badge">{t('kot.additional')}</span>}
        {reprint && <span className="badge">{t('kot.reprint')}</span>}
      </p>

      <hr />
      <table className="meta">
        <tbody>
          <tr>
            <th>{t('kot.order')}</th>
            <td className="strong">{order.orderNumber}</td>
          </tr>
          {order.tableName && (
            <tr>
              <th>{t('kot.table')}</th>
              <td className="strong" style={{ fontSize: 16 }}>
                {format.digits(order.tableName)}
              </td>
            </tr>
          )}
          {order.guests && (
            <tr>
              <th>{t('kot.guests')}</th>
              <td className="strong">{format.number(order.guests)}</td>
            </tr>
          )}
          <tr>
            <th>{t('kot.type')}</th>
            <td>{t(`orderType.${order.orderType}`)}</td>
          </tr>
          <tr>
            <th>{t('kot.time')}</th>
            <td>
              {format.date(stamp)} {format.time(stamp)}
            </td>
          </tr>
          {order.customer && (
            <tr>
              <th>{t('kot.customer')}</th>
              <td>
                {order.customer.name} · {format.digits(order.customer.phone)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <hr />
      <table>
        <thead>
          <tr>
            <th className="kot-qty">{t('kot.qty')}</th>
            <th>{t('kot.item')}</th>
            {showPrices && <th className="num">{t('kot.price')}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="kot-row">
              <td className="kot-qty">{format.number(item.quantity)} ×</td>
              <td>
                {format.text(item.name)}
                {item.note && (
                  <span className="kot-note">
                    {t('kot.note')}: {format.text(item.note)}
                  </span>
                )}
              </td>
              {showPrices && <td className="num">{format.currency(calculateLineTotal(item))}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <p className="strong">{t('kot.itemsCount', { count: quantity })}</p>
      {showPrices && (
        <p className="strong">
          {t('kot.total')}: {format.currency(total)}
        </p>
      )}
    </div>
  );
}

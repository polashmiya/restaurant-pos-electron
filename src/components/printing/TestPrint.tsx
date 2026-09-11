import type { DocumentContext } from './documentTypes';
import { paperClass } from './printStyles';

/** Printer check page: both scripts, both fonts sizes, width markers. */
export function TestPrint({ context, printerLabel, printedAt }: { context: DocumentContext; printerLabel: string; printedAt?: string }) {
  const { t, format, restaurant, language, paperWidth } = context;
  const stamp = printedAt ?? new Date().toISOString();
  return (
    <div className={paperClass(paperWidth)} lang={language} data-document="test">
      <p className="title c">{format.text(restaurant.name)}</p>
      <hr />
      <p className="heading">{t('print.testTitle')}</p>
      <p className="c">{t('print.testLine')}</p>
      <hr />
      <table className="meta">
        <tbody>
          <tr>
            <th>{t('receipt.date')}</th>
            <td>{format.dateTime(stamp)}</td>
          </tr>
          <tr>
            <th>{t('settings.printer.paperWidth')}</th>
            <td>{paperWidth}</td>
          </tr>
          <tr>
            <th>{t('settings.printer.receiptPrinter')}</th>
            <td>{printerLabel}</td>
          </tr>
        </tbody>
      </table>
      <hr />
      <p>বাংলা: আমার সোনার বাংলা, আমি তোমায় ভালোবাসি। ০১২৩৪৫৬৭৮৯ ৳</p>
      <p>English: The quick brown fox jumps over the lazy dog. 0123456789</p>
      <hr />
      <table>
        <tbody>
          <tr className="total">
            <td>{t('receipt.total')}</td>
            <td className="num">{format.currency(1234.5)}</td>
          </tr>
        </tbody>
      </table>
      <hr className="double" />
    </div>
  );
}
